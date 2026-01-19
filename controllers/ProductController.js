import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get the absolute path to the public folder
const getPublicPath = (relativePath) => {
  return path.join(__dirname, '../../frontend/public', relativePath);
};

// Get all products with filtering and search
export const getProducts = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      brand, 
      minPrice, 
      maxPrice, 
      status,
      sort = '-createdAt',
      page = 1,
      limit = 12
    } = req.query;

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
    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      specifications: req.body.specifications ? JSON.parse(req.body.specifications) : {}
    };

    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = getPublicPath(`/uploads/products/${file.filename}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- CRITICAL UPDATE: FIXED UPDATE LOGIC ---
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updateData = { ...req.body };
    
    if (req.body.specifications) {
      updateData.specifications = JSON.parse(req.body.specifications);
    }

    // 1. Determine which images the user wants to KEEP
    // In your React code, you append 'existingImages' to FormData
    let keptImages = [];
    if (req.body.existingImages) {
      keptImages = JSON.parse(req.body.existingImages);
    } else if (!req.files || req.files.length === 0) {
        // Fallback: if no instruction provided, keep current images
        keptImages = product.images;
    }

    // 2. Physical File Deletion: Remove images that were deleted in the UI
    const imagesToDelete = product.images.filter(img => !keptImages.includes(img));
    imagesToDelete.forEach(image => {
      const imagePath = getPublicPath(image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    // 3. Handle NEWLY uploaded images
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    // 4. Combine Kept Images + New Images
    updateData.images = [...keptImages, ...newImageUrls];

    // Apply updates
    Object.assign(product, updateData);
    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.images.forEach(image => {
      const imagePath = getPublicPath(image);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    });

    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete single image specifically
export const deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.images.length <= 1) {
      return res.status(400).json({ success: false, message: 'Product must have at least one image' });
    }

    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();

    const imagePath = getPublicPath(imageUrl);
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