const router = require('express').Router();
const notes = require('../controllers/notesController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notes.listNotes);
router.get('/counts', notes.noteCounts);
router.get('/:id', notes.getNote);
router.post('/', notes.createNote);
router.patch('/:id', notes.updateNote);
router.delete('/:id', notes.deleteNote);

module.exports = router;
