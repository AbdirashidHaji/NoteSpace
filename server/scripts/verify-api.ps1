# NoteSpace end-to-end API verification
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:4000/api'
$pass = 0; $fail = 0
function Check($name, $cond, $extra = '') {
  if ($cond) { $script:pass++; Write-Host "PASS  $name" }
  else { $script:fail++; Write-Host "FAIL  $name $extra" }
}
function J($body) { $body | ConvertTo-Json -Depth 5 }
function Invoke-Json($method, $url, $token, $payload) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    $bodyText = $null
    if ($payload) { $bodyText = J $payload }
    $resp = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $bodyText
    return @{ ok = $true; data = $resp }
  } catch {
    $msg = ''
    try { $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()); $msg = $reader.ReadToEnd() } catch { $msg = $_.Exception.Message }
    return @{ ok = $false; status = $_.Exception.Response.StatusCode.value__; message = $msg }
  }
}

# 1) Register user A
$r = Invoke-Json Post "$base/auth/register" $null @{ name = 'Ada Lovelace'; email = 'ada@notespace.test'; password = 'supersecret1' }
Check 'register user A' $r.ok $r.message
$A = $r.data.token

# duplicate email -> 409
$r = Invoke-Json Post "$base/auth/register" $null @{ name = 'Ada Again'; email = 'ada@notespace.test'; password = 'supersecret1' }
Check 'duplicate email rejected (409)' (-not $r.ok -and $r.status -eq 409) "$($r.status)"

# 2) me
$r = Invoke-Json Get "$base/auth/me" $A
Check 'auth/me returns user' ($r.ok -and $r.data.user.email -eq 'ada@notespace.test')

# 3) Categories
$r = Invoke-Json Post "$base/categories" $A @{ name = 'Work'; color = '#10b981' }
Check 'create category' ($r.ok -and $r.data.category.name -eq 'Work')
$catId = $r.data.category.id
$r = Invoke-Json Post "$base/categories" $A @{ name = 'Work' }
Check 'duplicate category rejected (409)' (-not $r.ok -and $r.status -eq 409)
$r = Invoke-Json Post "$base/categories" $A @{ name = 'Personal' }
$catId2 = $r.data.category.id
Check 'second category' $r.ok
$r = Invoke-Json Get "$base/categories" $A
Check 'list categories (2)' ($r.ok -and $r.data.total -eq 2)
$r = Invoke-Json Patch "$base/categories/$catId" $A @{ name = 'Workspace' }
Check 'rename category' ($r.ok -and $r.data.category.name -eq 'Workspace')

# 4) Tags
$r = Invoke-Json Post "$base/tags" $A @{ name = 'urgent' }
Check 'create tag' $r.ok
$tagId = $r.data.tag.id
$r = Invoke-Json Post "$base/tags" $A @{ name = 'urgent' }
Check 'duplicate tag rejected (409)' (-not $r.ok -and $r.status -eq 409)
$r = Invoke-Json Post "$base/tags" $A @{ name = 'ideas' }
$tagId2 = $r.data.tag.id

# 5) Notes CRUD
$r = Invoke-Json Post "$base/notes" $A @{ title = 'Project kickoff'; content = '<h2>Agenda</h2><p>Discuss <b>roadmap</b> and assign tasks.</p><ul><li>Budget</li><li>Timeline</li></ul>'; categoryId = $catId; tags = @($tagId, 'fresh-tag'); isPinned = $true }
Check 'create note with category+tags (name-create)' ($r.ok -and $r.data.note.is_pinned -eq 1 -and $r.data.note.title -eq 'Project kickoff')
$created = Invoke-Json Get "$base/notes/$noteId" $A
Check 'create note tags assigned via GET' ($created.ok -and @($created.data.note.tags).Count -eq 2)
$noteId = $r.data.note.id
Check 'note content sanitized (script stripped)' ($r.data.note.content -notmatch 'script')
$r = Invoke-Json Post "$base/notes" $A @{ title = 'Shopping list'; content = '<p>Milk, eggs, <script>alert(1)</script>bread</p>'; categoryId = $catId2 }
$note2Id = $r.data.note.id
Check 'XSS attempt stripped from content' ($r.ok -and $r.data.note.content -notmatch 'script' -and $r.data.note.content -match 'bread')
$r = Invoke-Json Post "$base/notes" $A @{ title = 'Deep thoughts'; content = '<p>Philosophy and other long-form ideas live here.</p>' }
$note3Id = $r.data.note.id

# read single
$r = Invoke-Json Get "$base/notes/$noteId" $A
Check 'get note by id (has category name)' ($r.ok -and $r.data.note.category_name -eq 'Workspace')

# 6) list / sort / filter / search
$r = Invoke-Json Get "$base/notes?view=all" $A
Check 'list all notes (3)' ($r.ok -and $r.data.total -eq 3)
$r = Invoke-Json Get "$base/notes?view=pinned" $A
Check 'view=pinned returns 1' ($r.ok -and $r.data.total -eq 1 -and $r.data.notes[0].id -eq $noteId)
$r = Invoke-Json Get "$base/notes?view=favorites&sort=title" $A
Check 'favorites view empty' ($r.ok -and $r.data.total -eq 0)
$r = Invoke-Json Get "$base/notes?category=$catId" $A
Check 'filter by category' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Get "$base/notes?tag=$tagId" $A
Check 'filter by tag' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Get "$base/notes?q=roadmap" $A
Check 'search in content' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Get "$base/notes?q=Workspace" $A
Check 'search matches category name' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Get "$base/notes?q=urgent" $A
Check 'search matches tag name' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Get "$base/notes?sort=oldest" $A
Check 'sort oldest (title asc)' ($r.ok -and $r.data.total -eq 3)
$r = Invoke-Json Get "$base/notes?sort=title" $A
Check 'sort by title (pinned first)' ($r.ok -and $r.data.notes[0].title -eq 'Project kickoff')

# 7) updates: favorite, unpin, archive
$r = Invoke-Json Patch "$base/notes/$noteId" $A @{ isFavorite = $true }
Check 'favorite note' ($r.ok -and $r.data.note.is_favorite -eq 1)
$r = Invoke-Json Get "$base/notes?view=favorites" $A
Check 'favorites view now 1' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Patch "$base/notes/$noteId" $A @{ isPinned = $false }
Check 'unpin note' ($r.ok -and $r.data.note.is_pinned -eq 0)
$r = Invoke-Json Patch "$base/notes/$note2Id" $A @{ isArchived = $true }
Check 'archive note' ($r.ok -and $r.data.note.is_archived -eq 1)
$r = Invoke-Json Get "$base/notes?view=all" $A
Check 'archived excluded from all view' ($r.ok -and $r.data.total -eq 2)
$r = Invoke-Json Get "$base/notes?view=archive" $A
Check 'archive view has 1' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Patch "$base/notes/$note2Id" $A @{ isArchived = $false }
Check 'unarchive note' $r.ok

# 8) trash / restore / permanent
$r = Invoke-Json Delete "$base/notes/$note2Id" $A
Check 'move to trash' $r.ok
$r = Invoke-Json Get "$base/notes?view=trash" $A
Check 'trash view has 1' ($r.ok -and $r.data.total -eq 1)
$r = Invoke-Json Patch "$base/notes/$note2Id" $A @{ restore = $true }
Check 'restore from trash' ($r.ok -and $r.data.note.deleted_at -eq $null)
$r = Invoke-Json Delete "$base/notes/$note2Id" $A
$r = Invoke-Json Delete "$base/notes/$note2Id`?permanent=1" $A
Check 'permanent delete' $r.ok
$r = Invoke-Json Get "$base/notes/$note2Id" $A
Check 'permanently deleted note gone (404)' (-not $r.ok -and $r.status -eq 404)

# 9) ownership checks with user B
$r = Invoke-Json Post "$base/auth/register" $null @{ name = 'Bob Marley'; email = 'bob@notespace.test'; password = 'supersecret2' }
Check 'register user B' $r.ok
$B = $r.data.token
$r = Invoke-Json Get "$base/notes/$noteId" $B
Check "user B cannot read user A's note (404)" (-not $r.ok -and $r.status -eq 404)
$r = Invoke-Json Patch "$base/notes/$noteId" $B @{ title = 'hacked' }
Check "user B cannot update user A's note (404)" (-not $r.ok -and $r.status -eq 404)
$r = Invoke-Json Delete "$base/notes/$noteId" $B
Check "user B cannot delete user A's note (404)" (-not $r.ok -and $r.status -eq 404)
$r = Invoke-Json Get "$base/notes?view=all" $B
Check "user B sees only own notes (0)" ($r.ok -and $r.data.total -eq 0)
$r = Invoke-Json Patch "$base/categories/$catId" $B @{ name = 'stolen' }
Check "user B cannot rename user A's category" (-not $r.ok -and $r.status -eq 404)
$r = Invoke-Json Post "$base/categories" $B @{ name = 'Workspace' }
Check 'same category name allowed across users' $r.ok

# 10) password change
$r = Invoke-Json Patch "$base/auth/password" $A @{ currentPassword = 'wrongpass'; newPassword = 'brandnewpass1' }
Check 'wrong current password rejected' (-not $r.ok -and $r.status -eq 400)
$r = Invoke-Json Patch "$base/auth/password" $A @{ currentPassword = 'supersecret1'; newPassword = 'brandnewpass1' }
Check 'password change works' $r.ok
$r = Invoke-Json Post "$base/auth/login" $null @{ email = 'ada@notespace.test'; password = 'brandnewpass1' }
Check 'login with new password' ($r.ok -and $r.data.token)
$r = Invoke-Json Post "$base/auth/login" $null @{ email = 'ada@notespace.test'; password = 'wrong' }
Check 'login with wrong password rejected (401)' (-not $r.ok -and $r.status -eq 401)
$r = Invoke-Json Post "$base/auth/login" $null @{ email = 'nobody@x.test'; password = 'whatever1' }
Check 'unknown email login rejected (401)' (-not $r.ok -and $r.status -eq 401)

# 11) profile rename
$r = Invoke-Json Patch "$base/auth/profile" $A @{ name = 'Ada L.' }
Check 'profile rename' ($r.ok -and $r.data.user.name -eq 'Ada L.')

# 12) counts + validation edge cases
$r = Invoke-Json Get "$base/notes/counts" $A
Check 'note counts endpoint' ($r.ok -and $r.data.counts.all -eq 2)
$r = Invoke-Json Get "$base/notes?view=bogus" $A
Check 'unknown view rejected (400)' (-not $r.ok -and $r.status -eq 400)
$r = Invoke-Json Delete "$base/categories/$catId" $A
Check 'delete category' $r.ok
$r = Invoke-Json Get "$base/notes/$noteId" $A
Check "note survives category delete (category cleared)" ($r.ok -and $r.data.note.category_id -eq $null)
$r = Invoke-Json Delete "$base/tags/$tagId" $A
Check 'delete tag' $r.ok
$r = Invoke-Json Get "$base/notes/$noteId" $A
Check 'note tag association removed' ($r.ok -and $r.data.note.tags.Count -eq 1)

Write-Host "`n=== RESULTS: $pass passed, $fail failed ==="
