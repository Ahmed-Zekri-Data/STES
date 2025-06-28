const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  address1: {
    type: String,
    required: true,
    trim: true
  },
  address2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  postalCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'Tunisia'
  },
  phone: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const customerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^(\+216)?[0-9]{8}$/, 'Please enter a valid Tunisian phone number']
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  addresses: [addressSchema],
  preferences: {
    language: {
      type: String,
      enum: ['fr', 'ar', 'en'],
      default: 'fr'
    },
    currency: {
      type: String,
      default: 'TND'
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  orderCount: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ 'addresses.isDefault': 1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if account is locked
customerSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for default address
customerSchema.virtual('defaultAddress').get(function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
});

// Pre-save middleware to hash password
customerSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to ensure only one default address
customerSchema.pre('save', function(next) {
  if (this.addresses && this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    if (defaultAddresses.length > 1) {
      // Keep only the first default address
      this.addresses.forEach((addr, index) => {
        if (index > 0 && addr.isDefault) {
          addr.isDefault = false;
        }
      });
    } else if (defaultAddresses.length === 0 && this.addresses.length > 0) {
      // Set first address as default if none is set
      this.addresses[0].isDefault = true;
    }
  }
  next();
});

// Method to compare password
customerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to increment login attempts
customerSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
customerSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to add address
customerSchema.methods.addAddress = function(addressData) {
  // If this is the first address or marked as default, make it default
  if (this.addresses.length === 0 || addressData.isDefault) {
    // Remove default from other addresses
    this.addresses.forEach(addr => addr.isDefault = false);
    addressData.isDefault = true;
  }

  this.addresses.push(addressData);
  return this.save();
};

// Method to update address
customerSchema.methods.updateAddress = function(addressId, addressData) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error('Address not found');
  }

  // If setting as default, remove default from others
  if (addressData.isDefault) {
    this.addresses.forEach(addr => {
      if (addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
  }

  Object.assign(address, addressData);
  return this.save();
};

// Method to remove address
customerSchema.methods.removeAddress = function(addressId) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error('Address not found');
  }

  const wasDefault = address.isDefault;
  address.remove();

  // If removed address was default, make first remaining address default
  if (wasDefault && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }

  return this.save();
};

// Static method to find by credentials
customerSchema.statics.findByCredentials = async function(email, password) {
  const customer = await this.findOne({
    email: email.toLowerCase(),
    isActive: true
  });

  if (!customer) {
    throw new Error('Invalid credentials');
  }

  if (customer.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }

  const isMatch = await customer.comparePassword(password);

  if (!isMatch) {
    await customer.incLoginAttempts();
    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  if (customer.loginAttempts > 0) {
    await customer.resetLoginAttempts();
  }

  return customer;
};

module.exports = mongoose.model('Customer', customerSchema);
