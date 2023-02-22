const router = require('express').Router();

const CategoryModel = require('../models/category');
const OrderModel = require('../models/order');
const OrderStatus = require('../constants/order-status');
const Passport = require('../modules/passport');
const ProductModel = require('../models/product');
const ShoppingCart = require('../modules/shopping-cart');

const moment = require('moment');


// Lấy ra trang chủ
router.get('/', async (req, res) => {
  // model obj chứa 2 array gồm category và product
  const model = {
    categories: [],
    products: []
  };
  // Tìm trong category có thuốc tính isdelete = 0
  model.categories = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();
  // Tìm trong product có thuộc tính isdelete = 0
  model.products = await ProductModel.find(
    {
      isDeleted: false
    }
  ).lean();
  // Load ra index thứ tự theo category và product
  if (model.categories && model.categories.length > 0 && model.products && model.products.length > 0) {
    for (const x of model.categories) {
      x.counter = 0;

      for (const y of model.products) {
        if (y.categoryId === x.id) {
          x.counter += 1;
        }
      }
    }
  } 
  res.render('site/index', model);
});
// Lấy ra trang danh mục sản phẩm
router.get('/danh-muc/:name.:id.html', async (req, res) => {
  // model obj chứa 2 array gồm category và product
  const model = {
    categories: [],
    products: []
  };
  // Tìm trong category có thuốc tính isdelete = 0
  model.categories = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();
  // Tìm trong product có thuộc tính cate:id và isdelete = 0
  model.products = await ProductModel.find(
    {
      categoryId: req.params.id,
      isDeleted: false
    }
  ).lean();
  // Trả về file category cùng với model
  res.render('site/category', model);
});
// Lấy trang chi tiết sản phẩm
router.get('/san-pham/:name.:productId.:categoryId.html', async (req, res) => {
  const model = {};
  // Tìm trong table Product thuộc tính isDeleted và product:id
  model.data = await ProductModel.findOne(
    {
      id: req.params.productId,
      isDeleted: false
    }
  ).lean();
  // Nếu
  if (!model.data || !model.data.id) 
  {
    res.redirect('/');
  }
  else 
  {
    model.products = await ProductModel.find(
      {
        categoryId: model.data.categoryId,
        isDeleted: false,
        id: {
          $ne: model.data.id
        }
      }
    ).limit(4).lean(); // Chỉ hiện thị 4 sản phẩm
    
    res.render('site/product', model);
  }
});
// Hàm lấy ra giỏ hàng
function getShoppingCart(req) {
  if (req.session.cart) {
    return {
      hasExisted: true,
      cart: new ShoppingCart(req.session.cart)
    };
  }

  return {
    hasExisted: false,
    cart: new ShoppingCart(
      {
        items: {}
      }
    )
  };
}
// Lấy ra trang giỏ hàng
router.get('/gio-hang.html', async (req, res) => {
  const { hasExisted, cart} = getShoppingCart(req);

  const model = {
    data: cart.getItemList()
  };

  model.products = await ProductModel.find(
    {
      isDeleted: false
    }
  ).lean();
  
  res.render('site/cart', model);
});

router.get('/cart/add/:id', async (req, res) => {
  const docProduct = await ProductModel.findOne(
    {
      id: req.params.id,
      isDeleted: false
    }
  ).lean();

  if (docProduct && docProduct.id) {
    const { response, cart} = getShoppingCart(req);

    cart.addItem(docProduct.id, docProduct);

    req.session.cart = cart;
  }

  res.redirect('/gio-hang.html');
});
// Xóa giỏ hàng
router.post('/cart/delete', async (req, res) => {
  const { hasExisted, cart} = getShoppingCart(req);

  if (hasExisted === true) {
    cart.delete(req.body.id);
  }

  req.session.cart = cart;

  res.json({
    isSucceed: true
  });
});
// Update giỏ hàng
router.post('/cart/update', async (req, res) => {
  const { hasExisted, cart} = getShoppingCart(req);

  if (hasExisted === true) {
    cart.updateQuantity(req.body.id, req.body.quantity);

    req.session.cart = cart;
  }

  res.json({
    isSucceed: true
  });
});
// Lấy ra trang đặt hàng
router.get('/dat-hang.html', async (req, res, next, isAdmin = true) => {
  return Passport.requireAuth(req, res, next, false);
}, (req, res) => {
  if (!req.session.cart
      || !req.session.cart.items
      || !req.session.cart.items.length < 1) {
    return res.redirect('/');
  }

  res.render('site/checkout', {
    errors: null
  });
});

router.post('/dat-hang.html', async (req, res) => {
  const { hasExisted, cart} = getShoppingCart(req);

  if (hasExisted === false) {
    return res.redirect('/');
  }

  const createData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    msg: req.body.message,
    total: 0,
    status: OrderStatus.submit,
    ship: req.body.ship,
    payment: req.body.payment,
    isDeleted: false,
    userId: req.id
  };

  createData.createdAt = moment();
  createData.details = cart.getItemList();

  for (const detail of createData.details) {
    if (detail) {
      createData.total += (detail.quantity * detail.price);
    }
  }

  await OrderModel.create(createData);

  req.session.cart = {
    items: {}
  };

  res.redirect('/');
});

router.post('/menu', async (req, res) => {
  const lstCategory = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();

  if (lstCategory) {
    res.json(lstCategory);
  }
});

router.get('/tim-kiem.html', async (req, res) => {
  const model = {
    categories: [],
    products: []
  };

  const query = {
    isDeleted: false
  };

  if (req.query.keyword && req.query.keyword.length > 0) {
    query.name = RegExp(req.query.keyword, 'i');
  }

  model.products = await ProductModel.find(query).lean();
  
  model.categories = await CategoryModel.find(
    {
      isDeleted: false
    }
  ).lean();
  
  res.render('site/tim-kiem', model);
});

// router.get('/huong-dan.html', async (req, res) => {
//   res.render('site/huongdan');
// });

// router.get('/security.html', async (req, res) => {
//   res.render('site/security');
// });

// router.get('/huong-dan.html', async (req, res) => {
//   res.render('site/huongdan');
// });

// router.get('/Payment.html', async (req, res) => {
//   res.render('site/Payment');
// });
// router.get('/dangki.html', async (req, res) => {
//   res.render('site/dangki');  
// });


module.exports = router;
