import Product from '../models/Product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FIXED: Helper to get the absolute path. 
 * On hosting (Render), we save to a folder inside the backend root, 
 * not the frontend folder.
 */
const getPublicPath = (relativePath) => {
  // Normalize path: remove leading slash to prevent joining errors
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return path.join(__dirname, '../', cleanPath);
};

// Ensure upload directory exists on the server start
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

    // Debug: Log products with images
    console.log('📦 Products fetched:', products.length);
    products.forEach(p => {
      if (p.images && p.images.length > 0) {
        console.log(`  - ${p.name}: ${p.images.length} image(s)`, p.images);
      } else {
        console.log(`  - ${p.name}: No images`);
      }
    });

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
    const { name, description, category, brand, price, quantity, status, specifications } = req.body;

    const productData = {
      name,
      description,
      category,
      brand,
      price: Number(price),
      quantity: Number(quantity),
      status: status || 'active',
      specifications: specifications ? JSON.parse(specifications) : {}
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
    if (req.files) {
      req.files.forEach(file => {
        const filePath = getPublicPath(`/uploads/products/${file.filename}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product
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

    // Handle Image Logic
    let keptImages = [];
    if (req.body.existingImages !== undefined) {
      // existingImages was explicitly provided (could be empty array)
      keptImages = JSON.parse(req.body.existingImages);
    } else if (!req.files || req.files.length === 0) {
      // No new files and no existingImages specified, keep all current images
      keptImages = product.images;
    }

    // Normalize paths for comparison (remove leading slashes and normalize separators)
    const normalizePath = (path) => {
      if (!path) return '';
      return path.replace(/\\/g, '/').replace(/^\/+/, '');
    };

    // Delete removed images from server
    const keptImagesNormalized = keptImages.map(normalizePath);
    const imagesToDelete = product.images.filter(img => {
      const normalizedImg = normalizePath(img);
      return !keptImagesNormalized.includes(normalizedImg);
    });
    
    imagesToDelete.forEach(image => {
      const imagePath = getPublicPath(image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    // Handle newly uploaded files
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    updateData.images = [...keptImages, ...newImageUrls];

    // Apply updates
    Object.assign(product, updateData);
    await product.save();

    // Debug: Log the updated product
    console.log('📝 Product updated:', {
      id: product._id,
      name: product.name,
      images: product.images,
      imageCount: product.images.length
    });

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