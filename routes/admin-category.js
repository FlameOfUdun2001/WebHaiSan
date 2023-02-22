const router = require('express').Router();

const CategoryModel = require('../models/category');
const Charset = require('../modules/charset');
const Passport = require('../modules/passport');

router.get('/', Passport.requireAuth, (req, res) => {
  
  res.redirect('/admin/category/danh-sach.html'); 
});

router.get('/danh-sach.html', Passport.requireAuth, async (req, res) => {
  
  const model = {};
  
  model.data = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean(); 

  res.render('admin/category/list', model);
});
// Load trang thêm category
router.get('/them.html', Passport.requireAuth, (req, res) => {
  res.render('admin/category/create', {
    errors: null
  });
});

router.post('/them.html', Passport.requireAuth, async (req, res) => {
  req.checkBody('name', 'Name không được để trống').notEmpty();
  
  req.checkBody('name', 'Name nằm trong khoảng 5 - 32 ký tự').isLength(
    {
      min: 5,
      max: 32
    }
  );

  const errors = req.validationErrors();

  if (errors) {
    return res.render('admin/category/create', {
      errors
    });
  }

  await CategoryModel.create(
    {
      name: req.body.name,
      urlRewriteName: Charset.removeUnicode(req.body.name),
      isDeleted: false
    }
  );

  req.flash('response_message', 'Thêm danh mục sản phẩm thành công !');

  res.redirect('/admin/category/danh-sach.html');
});
// Sửa Category
router.get('/sua/:id.html', Passport.requireAuth, async (req, res) => {
  const docCategory = await CategoryModel.findOne(
    {
      id: req.params.id,
      isDeleted: false
    }
  ).lean();

  res.render('admin/category/edit', {
    errors: null,
    data: docCategory
  });
});

router.post('/sua/:id.html', Passport.requireAuth, async (req, res) => {
  const docCategory = await CategoryModel.findOne(
    {
      id: req.params.id,
      isDeleted: false
    }
  ).lean();

  req.checkBody('name', 'Value cannot be empty').notEmpty();
  
  req.checkBody('name', 'Name from 5 to 32 characters').isLength(
    {
      min: 5,
      max: 32
    }
  );

  const errors = req.validationErrors();
  
  if (errors){
    return res.render('admin/category/edit', {
      errors,
      data: docCategory
    });
  }
  
  await CategoryModel.update(
    {
      id: docCategory.id
    },
    {
      name: req.body.name,
      urlRewriteName: Charset.removeUnicode(req.body.name)
    }
  );

  req.flash('response_message', 'Sửa danh mục sản phẩm thành công !');

  res.redirect(`/admin/category/danh-sach.html`);
});

router.get('/xoa/:id', Passport.requireAuth, async (req, res) => {
  const docCategory = await CategoryModel.findOne(
    {
      id: req.params.id,
      isDeleted: false
    }
  ).lean();

  if (!docCategory || !docCategory.id) {
    req.flash('response_message', 'Invalid Input Parameter');
  } else {
    await CategoryModel.update(
      {
        id: docCategory.id
      },
      {
        isDeleted: true
      }
    );

    req.flash('response_message', 'Xóa danh mục sản phẩm thành công !');
  }

  res.redirect('/admin/category/danh-sach.html');
});

module.exports = router;
