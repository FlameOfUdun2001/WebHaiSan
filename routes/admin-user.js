const router = require('express').Router();

const multer  = require('multer');

const upload = multer(
  {
    storage:  multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './public/upload');
      },
      filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
      }
    })
  }
);

const BcryptJs = require('bcryptjs');
const Passport = require('../modules/passport');
const UserModel = require('../models/user');
const UserRole = require('../constants/user-role');
const { db } = require('../models/user');

router.get('/', Passport.requireAuth, (req, res) => {
  res.redirect('/admin/user/danh-sach.html'); 
});
// List Danh sách User
router.get('/danh-sach.html', Passport.requireAuth, async (req, res) => {
  const model = {};
  
  model.data = await UserModel.find().lean();
  
  res.render('admin/user/list', model);
});
// Sửa User
router.get('/sua/:id.html', Passport.requireAuth, async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  docUser.password = '';

  const aRole = [];

  for (const x in UserRole) {
    aRole.push(UserRole[`${x}`]);
  }

  res.render('admin/user/edit', {
    errors: null,
    roles: aRole,
    user: docUser
  });
});
// Sửa User
router.post('/sua/:id.html', Passport.requireAuth, upload.single('hinh'), async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id
    }
  ).lean();

  docUser.password = '';

  const aRole = [];

  for (const x in UserRole) {
    aRole.push(UserRole[`${x}`]);
  }

  req.checkBody('fullname', 'Name không được để trống').notEmpty();

  req.checkBody('fullname', 'Name nằm trong khoảng 5 - 32 ký tự').isLength(
    {
      min: 5,
      max: 32
    }
  );

  req.checkBody('email', 'Email không được để trống').notEmpty();

  req.checkBody('email', 'Email không đúng định dạng').isEmail();

  const errors = req.validationErrors();
  
  if (errors){
    console.log();
    console.log(errors);
    // return res.render('admin/user/edit', {
    //   errors,
    //   roles: aRole,
    //   user: docUser
    // });
  }

  const sEmail = req.body.email.trim().toLowerCase();

  if (sEmail !== docUser.email) {
    const lst = await UserModel.find(
      {
        email: req.body.email
      }
    ).lean();

    if (lst && lst.length > 0) {
      return res.render('admin/user/edit', {
        errors: [
          {
            msg: 'Email already exists'
          }
        ],
        roles: aRole,
        user: docUser
      });
    }
  }

  const updateData = {
    fullname: req.body.fullname,
    email: req.body.email
  };

  if (req.body.password && req.body.password.length > 0) {
    const sHashSalt = BcryptJs.genSaltSync(16);
      
    updateData.password = BcryptJs.hashSync(req.body.password, sHashSalt);
  }

  if (req.file && req.file.filename) {
    updateData.photo = req.file.filename;
  }

  if (req.body.role && req.body.role.length > 0) {
    updateData.roles = [];

    for (const x of req.body.role.split('|')) {
      if (x && x.length > 0) {
        updateData.roles.push(x);
      }
    }
  }
  
  await UserModel.update(
    {
      id: docUser.id
    },
    updateData
  );

  req.flash('response_message', 'Sửa nhân viên thành công !');

  res.redirect(`/admin/user/danh-sach.html`);
});
// Xóa User
router.get('/xoa/:id', Passport.requireAuth, async (req, res) => {
  const docUser = await UserModel.findOne(
    {
      id: req.params.id,
      // isDeleted: false
      
    }
  ).lean();

  if (!docUser || !docUser.id) {
    req.flash('response_message', 'Invalid Input Parameter');
  } else {
    // await UserModel.updateOne(
    //   {
    //     id: docUser.id
    //   },
    //   {
    //     $set:{
    //       isDeleted: true
    //     }
    //   },
      
    // );
    await UserModel.findOneAndUpdate({id: docUser.id}, {isDeleted: true} , {new: true, useFindAndModify: false})
   
    req.flash('response_message', 'Xóa nhân viên thành công !');
  }
  res.redirect('/admin/user/danh-sach.html');
});

module.exports = router;
