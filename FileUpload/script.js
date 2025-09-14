// DOM elements
const fileInput = document.getElementById("fileInput");
const fileInputLabel = document.getElementById("fileInputLabel");
const uploadBtn = document.getElementById("uploadBtn");
const uploadForm = document.getElementById("uploadForm");
const loading = document.getElementById("loading");
const filesGrid = document.getElementById("filesGrid");

// File selection handling
fileInput.addEventListener("change", function (e) {
  const files = e.target.files;
  if (files.length > 0) {
    fileInputLabel.classList.add("file-selected");
    fileInputLabel.innerHTML = `📎 ${files.length} file(s) selected<br><small>Click to change files</small>`;
    uploadBtn.disabled = false;
  } else {
    fileInputLabel.classList.remove("file-selected");
    fileInputLabel.innerHTML =
      "📎 Click to select files or drag and drop<br><small>Supports: Images, PDF, TXT, DOC, DOCX (Max 10MB each)</small>";
    uploadBtn.disabled = true;
  }
});

// Drag and drop functionality
fileInputLabel.addEventListener("dragover", function (e) {
  e.preventDefault();
  this.style.background = "#f0f8ff";
  this.style.borderColor = "#007bff";
});

fileInputLabel.addEventListener("dragleave", function (e) {
  e.preventDefault();
  this.style.background = "white";
  this.style.borderColor = "#4facfe";
});

fileInputLabel.addEventListener("drop", function (e) {
  e.preventDefault();
  this.style.background = "white";
  this.style.borderColor = "#4facfe";

  const files = e.dataTransfer.files;
  fileInput.files = files;
  fileInput.dispatchEvent(new Event("change"));
});

// Form submission
uploadForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const files = fileInput.files;
  if (files.length === 0) {
    showAlert("Please select files to upload", "error");
    return;
  }

  // Show loading
  showLoading(true);
  uploadBtn.disabled = true;

  try {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      showAlert(result.message, "success");
      fileInput.value = "";
      fileInputLabel.classList.remove("file-selected");
      fileInputLabel.innerHTML =
        "📎 Click to select files or drag and drop<br><small>Supports: Images (including SVG), PDF, TXT, DOC, DOCX (Max 10MB each)</small>";
      uploadBtn.disabled = true;
      loadFiles(); // Refresh the files list
    } else {
      showAlert(result.message || "Upload failed", "error");
    }
  } catch (error) {
    console.error("Upload error:", error);
    showAlert("Upload failed: " + error.message, "error");
  } finally {
    showLoading(false);
    uploadBtn.disabled = false;
  }
});

// Load and display files
async function loadFiles() {
  try {
    const response = await fetch("/files");
    const result = await response.json();

    if (result.files && result.files.length > 0) {
      displayFiles(result.files);
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error("Error loading files:", error);
    showEmptyState();
  }
}

// Display files in grid
function displayFiles(files) {
  filesGrid.innerHTML = files
    .map(
      (file) => `
          <div class="file-card">
            <div class="file-info">
              <div class="file-name">${file.filename}</div>
              <div class="file-details">Size: ${formatFileSize(file.size)}</div>
              <div class="file-details">Uploaded: ${new Date(
                file.uploadDate
              ).toLocaleDateString()}</div>
            </div>
            <div class="file-actions">
              <a href="${
                file.url
              }"  target="_blank" class="btn btn-primary">View</a>
              <a href="/download/${file.filename}" download="${
        file.filename
      }" class="btn btn-success">Download</a>
            </div>
          </div>
        `
    )
    .join("");
}

// Show empty state
function showEmptyState() {
  filesGrid.innerHTML = `
          <div class="empty-state">
            <div>📁</div>
            <h3>No files uploaded yet</h3>
            <p>Upload some files to get started!</p>
          </div>
        `;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Show/hide loading
function showLoading(show) {
  loading.style.display = show ? "block" : "none";
}

// Show alert messages
function showAlert(message, type) {
  // Remove existing alerts
  const existingAlert = document.querySelector(".alert");
  if (existingAlert) {
    existingAlert.remove();
  }

  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.display = "block";

  const uploadSection = document.querySelector(".upload-section");
  uploadSection.insertBefore(alert, uploadSection.firstChild);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove();
    }
  }, 5000);
}

// Load files on page load
document.addEventListener("DOMContentLoaded", function () {
  loadFiles();
});
