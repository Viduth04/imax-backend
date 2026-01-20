import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPublicPath = (relativePath) => {
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return path.join(__dirname, '../', cleanPath);
};

const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const getProducts = async (req, res) => {
  try {
    const { search, category, brand, minPrice, maxPrice, status, sort = '-createdAt', page = 1, limit = 12 } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    const total = await Product.countDocuments(query);
    const products = await Product.find(query).sort(sort).limit(limit * 1).skip((page - 1) * limit);
    res.json({ success: true, products, totalPages: Math.ceil(total / limit), currentPage: Number(page), total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, category, brand, price, quantity, status, specifications } = req.body;
    const productData = {
      name, description, category, brand,
      price: Number(price), quantity: Number(quantity),
      status: status || 'active',
      specifications: specifications ? JSON.parse(specifications) : {}
    };

    if (req.files && req.files.length > 0) {
      // FIXED: Save path without redundant /uploads prefix
      productData.images = req.files.map(file => `products/${file.filename}`);
    }

    const product = await Product.create(productData);
    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        const filePath = getPublicPath(`uploads/products/${file.filename}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updateData = { ...req.body };
    if (req.body.specifications) updateData.specifications = JSON.parse(req.body.specifications);

    let keptImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : product.images;

    const normalizePath = (p) => p ? p.replace(/\\/g, '/').replace(/^\/+/, '') : '';
    const keptImagesNormalized = keptImages.map(normalizePath);
    
    product.images.filter(img => !keptImagesNormalized.includes(normalizePath(img))).forEach(image => {
      const imagePath = getPublicPath(image.includes('uploads') ? image : `uploads/${image}`);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    });

    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      // FIXED: Save path without redundant /uploads prefix
      newImageUrls = req.files.map(file => `products/${file.filename}`);
    }

    updateData.images = [...keptImages, ...newImageUrls];
    Object.assign(product, updateData);
    await product.save();

    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    product.images.forEach(image => {
      const imagePath = getPublicPath(image.includes('uploads') ? image : `uploads/${image}`);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();
    const imagePath = getPublicPath(imageUrl.includes('uploads') ? imageUrl : `uploads/${imageUrl}`);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    res.json({ success: true, message: 'Image deleted successfully', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand');
    res.json({ success: true, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};