const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const ShopProduct = require("../models/ShopProduct");

const getCustomerCart = async (customerId) => {
  return Cart.findOne({ customer: customerId })
    .populate("shop", "shopName address contact status")
    .populate({
      path: "items.product",
      populate: {
        path: "shop",
        select: "shopName address contact status",
      },
    });
};

const getCart = async (req, res) => {
  try {
    const cart = await getCustomerCart(req.user._id);

    if (!cart || !cart.items || cart.items.length === 0) {
      if (cart) {
        await Cart.deleteOne({ _id: cart._id }).catch(() => {});
      }
      return res.status(200).json({ cart: null, items: [] });
    }

    return res.status(200).json({ cart });
  } catch (error) {
    console.error("Fetch cart failed:", error);
    return res.status(500).json({ message: "Unable to retrieve cart" });
  }
};

const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  const requestedQuantity = Number(quantity);

  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    return res.status(400).json({ message: "Quantity must be a positive number" });
  }

  try {
    const product = await ShopProduct.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.isAvailable || product.quantity <= 0) {
      return res.status(400).json({ message: "Product is currently unavailable" });
    }

    if (requestedQuantity > product.quantity) {
      return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    }

    let cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      cart = new Cart({
        customer: req.user._id,
        shop: product.shop,
        items: [],
      });
    }

    // Only enforce one-shop-per-cart if cart actually has items from another shop.
    // If cart has 0 items, it adopts the new shop cleanly.
    if (
      cart.items &&
      cart.items.length > 0 &&
      cart.shop &&
      cart.shop.toString() !== product.shop.toString()
    ) {
      return res.status(400).json({
        message: "Cart already contains products from another shop. Please clear the cart before adding items from a different shop.",
      });
    }

    cart.shop = product.shop;

    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    const finalQuantity = existingItem ? existingItem.quantity + requestedQuantity : requestedQuantity;

    if (finalQuantity > product.quantity) {
      return res.status(400).json({ message: "Requested quantity exceeds available stock" });
    }

    if (existingItem) {
      existingItem.quantity = finalQuantity;
      existingItem.name = product.name;
      existingItem.unit = product.unit;
      existingItem.price = product.price;
    } else {
      cart.items.push({
        product: product._id,
        name: product.name,
        quantity: requestedQuantity,
        unit: product.unit,
        price: product.price,
      });
    }

    await cart.save();

    return res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    console.error("Add to cart failed:", error);
    return res.status(500).json({ message: "Unable to add product to cart" });
  }
};

const updateCartItem = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  const updatedQuantity = Number(quantity);

  if (!Number.isFinite(updatedQuantity)) {
    return res.status(400).json({ message: "Quantity must be a valid number" });
  }

  try {
    const cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((cartItem) => cartItem.product.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    if (updatedQuantity <= 0) {
      cart.items.splice(itemIndex, 1);
      if (cart.items.length === 0) {
        await Cart.deleteOne({ _id: cart._id });
        return res.status(200).json({ message: "Product removed from cart", cart: null });
      }
      await cart.save();
      return res.status(200).json({ message: "Cart item updated successfully", cart });
    }

    const product = await ShopProduct.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (updatedQuantity > product.quantity) {
      return res.status(400).json({ message: "Quantity exceeds available stock" });
    }

    cart.items[itemIndex].quantity = updatedQuantity;
    cart.items[itemIndex].name = product.name;
    cart.items[itemIndex].unit = product.unit;
    cart.items[itemIndex].price = product.price;

    await cart.save();

    return res.status(200).json({ message: "Cart item updated successfully", cart });
  } catch (error) {
    console.error("Update cart item failed:", error);
    return res.status(500).json({ message: "Unable to update cart item" });
  }
};

const removeFromCart = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const cart = await Cart.findOne({ customer: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.status(200).json({ message: "Product removed from cart", cart: null });
    }

    await cart.save();

    return res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    console.error("Remove cart item failed:", error);
    return res.status(500).json({ message: "Unable to remove cart item" });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.deleteMany({ customer: req.user._id });
    return res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Clear cart failed:", error);
    return res.status(500).json({ message: "Unable to clear cart" });
  }
};


module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
