const router = require('express').Router();
const categories = require('../controllers/categoriesController');
const tags = require('../controllers/tagsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Categories
router.get('/categories', categories.listCategories);
router.post('/categories', categories.createCategory);
router.patch('/categories/:id', categories.updateCategory);
router.delete('/categories/:id', categories.deleteCategory);

// Tags
router.get('/tags', tags.listTags);
router.post('/tags', tags.createTag);
router.patch('/tags/:id', tags.updateTag);
router.delete('/tags/:id', tags.deleteTag);

module.exports = router;
