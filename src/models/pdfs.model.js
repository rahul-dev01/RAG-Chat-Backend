const mongoose = require("mongoose");

const PdfSchema = new mongoose.Schema({
  // PDF Basic Information
  name: {
    type: String,
    required: [true, "PDF name is required"],
    trim: true,
    maxlength: [255, "PDF name cannot exceed 255 characters"]
  },
  original_name: {
    type: String,
    required: true,
    trim: true
  },
  uuid: {
    type: String,
    required: [true, "PDF UUID is required"],
    unique: true,
    index: true
  },

  // File Properties
  size: {
    type: Number,
    required: [true, "File size is required"],
    min: [0, "File size cannot be negative"]
  },
  mime_type: {
    type: String,
    default: "application/pdf"
  },
  page_count: {
    type: Number,
    min: [0, "Page count cannot be negative"]
  },

  // =============== CLOUDINARY FIELDS ===============
  // Storage Configuration
  storage_type: {
    type: String,
    enum: ["local", "cloudinary", "s3"],
    default: "cloudinary"
  },
  
  // Cloudinary Specific Fields
  cloudinary_url: {
    type: String,
    required: function() {
      return this.storage_type === 'cloudinary';
    },
    validate: {
      validator: function(v) {
        // Only validate if storage_type is cloudinary
        return this.storage_type !== 'cloudinary' || (v && v.length > 0);
      },
      message: 'Cloudinary URL is required when storage type is cloudinary'
    }
  },
  cloudinary_public_id: {
    type: String,
    required: function() {
      return this.storage_type === 'cloudinary';
    },
    validate: {
      validator: function(v) {
        return this.storage_type !== 'cloudinary' || (v && v.length > 0);
      },
      message: 'Cloudinary public ID is required when storage type is cloudinary'
    }
  },
  cloudinary_bytes: {
    type: Number,
    min: [0, "Cloudinary bytes cannot be negative"]
  },
  cloudinary_format: {
    type: String,
    default: "pdf"
  },
  cloudinary_resource_type: {
    type: String,
    default: "raw"
  },
  cloudinary_created_at: {
    type: Date
  },
  

  local_path: {
    type: String,
    required: function() {
      return this.storage_type === 'local';
    }
  },


  // Processing Status
  is_indexed: {
    type: Boolean,
    default: false,
    index: true
  },
  indexing_status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  indexed_at: {
    type: Date
  },

  // Content Information
  total_chunks: {
    type: Number,
    default: 0,
    min: [0, "Total chunks cannot be negative"]
  },
  successful_chunks: {
    type: Number,
    default: 0,
    min: [0, "Successful chunks cannot be negative"]
  },

  // User Association
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: [true, "User ID is required"],
    index: true
  },

  // Error Handling
  error_message: {
    type: String
  },

  // Metadata
  description: {
    type: String,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, "Tag cannot exceed 50 characters"]
  }],

  // Vector DB info
  milvus_collection: {
    type: String,
    default: "RAG_TEXT_EMBEDDING"
  },

  // Access Control
  is_public: {
    type: Boolean,
    default: false
  },
  shared_with: [{
    user_id: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    permission: {
      type: String,
      enum: ["read", "write"],
      default: "read"
    },
    shared_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PdfSchema.index({ uploaded_by: 1, createdAt: -1 });
PdfSchema.index({ uuid: 1, uploaded_by: 1 });
PdfSchema.index({ is_indexed: 1, indexing_status: 1 });
PdfSchema.index({ cloudinary_public_id: 1 }); 
PdfSchema.index({ storage_type: 1 }); 

// Virtual for human-readable file size
PdfSchema.virtual('size_mb').get(function () {
  return (this.size / (1024 * 1024)).toFixed(2);
});

// Virtual for download URL (works for both local and cloudinary)
PdfSchema.virtual('download_url').get(function () {
  if (this.storage_type === 'cloudinary' && this.cloudinary_url) {
    return this.cloudinary_url;
  } else if (this.storage_type === 'local' && this.local_path) {
    return `/api/v1/pdf/download/${this.uuid}`; // Your local download endpoint
  }
  return null;
});

// Virtual to check if file is stored in cloud
PdfSchema.virtual('is_cloud_stored').get(function () {
  return this.storage_type === 'cloudinary' || this.storage_type === 's3';
});

// Virtual for file source info
PdfSchema.virtual('storage_info').get(function () {
  if (this.storage_type === 'cloudinary') {
    return {
      type: 'cloudinary',
      url: this.cloudinary_url,
      public_id: this.cloudinary_public_id,
      bytes: this.cloudinary_bytes,
      format: this.cloudinary_format
    };
  } else if (this.storage_type === 'local') {
    return {
      type: 'local',
      path: this.local_path
    };
  }
  return { type: this.storage_type };
});


// Instance method: Check if user has access
PdfSchema.methods.hasAccess = function (userId) {
  if (this.uploaded_by.toString() === userId.toString()) return true;
  if (this.is_public) return true;
  return this.shared_with.some(entry => entry.user_id.toString() === userId.toString());
};

// Static method: Get all PDFs a user can see
PdfSchema.statics.findByUser = function (userId, options = {}) {
  return this.find({
    $or: [
      { uploaded_by: userId },
      { is_public: true },
      { 'shared_with.user_id': userId }
    ]
  }, null, options);
};

// Pre-save middleware
PdfSchema.pre('save', function (next) {
  if (this.isModified('is_indexed') && this.is_indexed && !this.indexed_at) {
    this.indexed_at = new Date();
    this.indexing_status = 'completed';
  }
  if (!this.original_name && this.name) {
    this.original_name = this.name;
  }
  

  // Set cloudinary_created_at if cloudinary_url is being set for first time
  if (this.isModified('cloudinary_url') && this.cloudinary_url && !this.cloudinary_created_at) {
    this.cloudinary_created_at = new Date();
  }
  
  // Ensure storage_type is set correctly
  if (this.cloudinary_url && this.cloudinary_public_id && !this.storage_type) {
    this.storage_type = 'cloudinary';
  }

  
  next();
});

// Get user permission method
PdfSchema.methods.getUserPermission = function(userId) {
  const userIdStr = userId.toString();
  const ownerIdStr = this.uploaded_by._id ? this.uploaded_by._id.toString() : this.uploaded_by.toString();
  
  // Owner has full access
  if (userIdStr === ownerIdStr) {
      return 'owner';
  }
  
  // Check if PDF is public
  if (this.is_public) {
      return 'read';
  }
  
  // Check shared permissions
  if (this.shared_with && this.shared_with.length > 0) {
      const userShare = this.shared_with.find(share => 
          share.user_id && share.user_id.toString() === userIdStr
      );
      if (userShare) {
          return userShare.permission || 'read';
      }
  }
  
  return 'none';
};

// Share PDF with user
PdfSchema.methods.shareWith = function(userId, permission = 'read') {
  // Check if trying to share with owner
  if (this.uploaded_by.toString() === userId.toString()) {
      throw new Error('Cannot share PDF with owner');
  }

  // Initialize shared_with array if it doesn't exist
  if (!this.shared_with) {
      this.shared_with = [];
  }

  // Check if already shared with this user
  const existingShareIndex = this.shared_with.findIndex(
      share => share.user_id && share.user_id.toString() === userId.toString()
  );

  if (existingShareIndex >= 0) {
      // Update existing permission
      this.shared_with[existingShareIndex].permission = permission;
      this.shared_with[existingShareIndex].shared_at = new Date();
  } else {
      // Add new share
      this.shared_with.push({
          user_id: userId,
          permission: permission,
          shared_at: new Date()
      });
  }

  // Return the instance so you can chain .save()
  return this.save();
};

// Remove sharing with user
PdfSchema.methods.removeSharing = function(userId) {
  // Check if shared_with array exists
  if (!this.shared_with || this.shared_with.length === 0) {
      throw new Error('PDF is not shared with any users');
  }

  // Find the sharing entry
  const shareIndex = this.shared_with.findIndex(
      share => share.user_id && share.user_id.toString() === userId.toString()
  );

  if (shareIndex === -1) {
      throw new Error('PDF is not shared with this user');
  }

  // Remove the sharing entry
  this.shared_with.splice(shareIndex, 1);

  // Return the instance so you can chain .save()
  return this.save();
};


// Method to get secure download URL (for Cloudinary)
PdfSchema.methods.getSecureDownloadUrl = function() {
  if (this.storage_type === 'cloudinary' && this.cloudinary_url) {
    return this.cloudinary_url;
  }
  return null;
};

// Method to check if PDF is stored in cloud
PdfSchema.methods.isCloudStored = function() {
  return this.storage_type === 'cloudinary' || this.storage_type === 's3';
};

// Static method to find PDFs by storage type
PdfSchema.statics.findByStorageType = function(storageType, options = {}) {
  return this.find({ storage_type: storageType }, null, options);
};

// Static method to find PDFs that need migration to cloud
PdfSchema.statics.findForCloudMigration = function(options = {}) {
  return this.find({ 
    storage_type: 'local',
    is_indexed: true,
    indexing_status: 'completed'
  }, null, options);
};

// Method to update Cloudinary info (useful for migrations)
PdfSchema.methods.updateCloudinaryInfo = function(cloudinaryResult) {
  this.storage_type = 'cloudinary';
  this.cloudinary_url = cloudinaryResult.secure_url;
  this.cloudinary_public_id = cloudinaryResult.public_id;
  this.cloudinary_bytes = cloudinaryResult.bytes;
  this.cloudinary_format = cloudinaryResult.format;
  this.cloudinary_resource_type = cloudinaryResult.resource_type;
  this.cloudinary_created_at = new Date(cloudinaryResult.created_at);
  
  return this.save();
};


const PDFSModel = mongoose.model("pdfs", PdfSchema);
module.exports = PDFSModel;