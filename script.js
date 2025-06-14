// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileDetails = document.getElementById('fileDetails');
const selectedFile = document.getElementById('selectedFile');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileType = document.getElementById('fileType');
const removeFile = document.getElementById('removeFile');
const compressionOptions = document.getElementById('compressionOptions');
const formatOptions = document.getElementById('formatOptions');
const compressBtn = document.getElementById('compressBtn');
const resultSection = document.getElementById('resultSection');
const downloadBtn = document.getElementById('downloadBtn');
const compressAgainBtn = document.getElementById('compressAgainBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Global variables
let currentFile = null;
let compressedFile = null;
let selectedQuality = null;
let selectedFormat = 'original';

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

removeFile.addEventListener('click', resetFile);

// Quality options
document.querySelectorAll('.quality-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.quality-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedQuality = option.dataset.quality;
        updateCompressButton();
    });
});

// Format options
document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedFormat = btn.dataset.format;
    });
});

compressBtn.addEventListener('click', compressFile);
downloadBtn.addEventListener('click', downloadFile);
compressAgainBtn.addEventListener('click', resetFile);

// Handle file selection
function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
        alert('Tipe file tidak didukung. Silakan pilih file gambar (JPG, PNG), PDF, atau dokumen Word (DOC, DOCX).');
        return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal ukuran file adalah 50MB.');
        return;
    }

    currentFile = file;
    updateFileDetails(file);
    showCompressionOptions();
}

// Update file details in UI
function updateFileDetails(file) {
    fileName.textContent = file.name;
    fileSize.textContent = `Ukuran: ${formatFileSize(file.size)}`;
    fileType.textContent = `Tipe: ${getFileType(file.type)}`;
    
    // Update file icon
    const fileIcon = selectedFile.querySelector('.file-icon i');
    fileIcon.className = `fas ${getFileIcon(file.type)}`;
    
    fileDetails.style.display = 'block';
}

// Show compression options
function showCompressionOptions() {
    compressionOptions.style.display = 'block';
    resultSection.style.display = 'none';

    // Show format options only for images
    if (currentFile.type.startsWith('image/')) {
        formatOptions.style.display = 'block';
    } else {
        formatOptions.style.display = 'none';
    }
}

// Reset file selection
function resetFile() {
    currentFile = null;
    compressedFile = null;
    selectedQuality = null;
    selectedFormat = 'original';
    
    fileInput.value = '';
    fileDetails.style.display = 'none';
    compressionOptions.style.display = 'none';
    resultSection.style.display = 'none';
    
    document.querySelectorAll('.quality-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.format-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.format-btn[data-format="original"]').classList.add('selected');
    
    compressBtn.disabled = true;
}

// Update compress button state
function updateCompressButton() {
    compressBtn.disabled = !selectedQuality;
}

// Compress file
async function compressFile() {
    if (!currentFile || !selectedQuality) return;

    showLoading(true);

    try {
        let result;
        if (currentFile.type.startsWith('image/')) {
            result = await compressImage(currentFile, selectedQuality, selectedFormat);
        } else {
            result = await compressDocument(currentFile);
        }

        if (result) {
            compressedFile = result;
            showCompressionResults();
        }
    } catch (error) {
        console.error('Error during compression:', error);
        alert('Terjadi kesalahan saat mengompres file. Silakan coba lagi.');
    } finally {
        showLoading(false);
    }
}

// Compress image
async function compressImage(file, quality, format) {
    return new Promise((resolve, reject) => {
        new Compressor(file, {
            quality: quality / 100,
            maxWidth: 1920,
            maxHeight: 1080,
            mimeType: format === 'original' ? file.type : `image/${format}`,
            success(result) {
                resolve(result);
            },
            error(err) {
                reject(err);
            }
        });
    });
}

// Compress document
async function compressDocument(file) {
    try {
        if (file.type === 'application/pdf') {
            return await compressPDF(file);
        } else if (file.type.includes('word')) {
            return await compressWordDocument(file);
        }
        return file;
    } catch (error) {
        console.error('Error in compressDocument:', error);
        throw error;
    }
}

// Compress PDF
async function compressPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
            updateMetadata: false
        });

        const compressedPdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50,
            updateMetadata: false
        });

        return new File([compressedPdfBytes], `compressed_${file.name}`, {
            type: 'application/pdf'
        });
    } catch (error) {
        console.error('Error compressing PDF:', error);
        throw error;
    }
}

// Compress Word document
async function compressWordDocument(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const compressedData = await simpleCompress(arrayBuffer);
        
        return new File([compressedData], `compressed_${file.name}`, {
            type: file.type
        });
    } catch (error) {
        console.error('Error compressing Word document:', error);
        throw error;
    }
}

// Simple compression for Word documents
async function simpleCompress(data, quality = 0.7) {
    // This is a placeholder for actual Word document compression
    // In a real implementation, you would use a proper Word document compression library
    return data;
}

// Show compression results
function showCompressionResults() {
    const originalSize = currentFile.size;
    const compressedSize = compressedFile.size;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

    document.getElementById('reductionPercentage').textContent = `${reduction}%`;
    document.getElementById('newFileSize').textContent = formatFileSize(compressedSize);
    
    resultSection.style.display = 'block';
    compressionOptions.style.display = 'none';
}

// Download compressed file
function downloadFile() {
    if (!compressedFile) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(compressedFile);
    link.download = compressedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get file type
function getFileType(mimeType) {
    const types = {
        'image/jpeg': 'JPG',
        'image/png': 'PNG',
        'application/pdf': 'PDF',
        'application/msword': 'DOC',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
    };
    return types[mimeType] || 'Unknown';
}

// Helper function to get file icon
function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return 'fa-file-image';
    } else if (mimeType === 'application/pdf') {
        return 'fa-file-pdf';
    } else if (mimeType.includes('word')) {
        return 'fa-file-word';
    }
    return 'fa-file';
}

// Intersection Observer untuk animasi section
function animateSectionsOnScroll() {
    const sections = document.querySelectorAll('section, .features, .help-section, .result-section');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    sections.forEach(sec => {
        sec.classList.add('section-animate');
        observer.observe(sec);
    });
}

document.addEventListener('DOMContentLoaded', animateSectionsOnScroll);

// Smooth scroll untuk navigasi
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
            e.preventDefault();
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
            // Update active class
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        }
    });
});

// Mobile Navigation
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
        menuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
    }
});

// Header scroll effect
const header = document.querySelector('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Update active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
        }
    });
});

// Scroll Progress and Scroll to Top functionality
const scrollProgress = document.querySelector('.scroll-progress');
const scrollToTop = document.querySelector('.scroll-to-top');

// Update scroll progress
window.addEventListener('scroll', () => {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    scrollProgress.style.transform = `scaleX(${scrolled / 100})`;

    // Show/hide scroll to top button
    if (window.scrollY > 300) {
        scrollToTop.classList.add('visible');
    } else {
        scrollToTop.classList.remove('visible');
    }
});

// Smooth scroll to top
scrollToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Konten untuk modal
const modalContents = {
  panduan: `
    <h2>Panduan Penggunaan</h2>
    <p>1. Pilih file yang ingin dikompres melalui tombol atau drag & drop ke area yang disediakan.</p>
    <p>2. Pilih kualitas dan format kompresi sesuai kebutuhan Anda.</p>
    <p>3. Klik "Kompres File" dan tunggu proses selesai.</p>
    <p>4. Unduh file hasil kompresi melalui tombol unduh.</p>
    <ul>
      <li>Format yang didukung: JPG, PNG, PDF</li>
      <li>Maksimal ukuran file: 10 MB</li>
    </ul>
  `,
  faq: `
    <h2>FAQ</h2>
    <p><b>Q:</b> Apakah file saya aman?</p>
    <p><b>A:</b> Ya, file Anda dihapus otomatis setelah 1 jam.</p>
    <p><b>Q:</b> Apakah ada batasan jumlah file?</p>
    <p><b>A:</b> Tidak, Anda dapat mengompres file sebanyak yang Anda mau.</p>
    <p><b>Q:</b> Apakah layanan ini gratis?</p>
    <p><b>A:</b> Ya, layanan ini 100% gratis.</p>
  `,
  kontak: `
    <h2>Kontak</h2>
    <p>Jika Anda membutuhkan bantuan lebih lanjut, silakan hubungi kami melalui email:</p>
    <p><a href='mailto:kayzaalvy1214@gmail.com'>kayzaalvy1214@gmail.com</a></p>
    <p>atau hubungi nomor WhatsApp <a href='https://wa.me/6283162555636' target='_blank'>083162555636</a></p>
  `
};

// Modal logic
const modal = document.getElementById('customModal');
const modalContent = document.getElementById('modalContent');
const modalCloseBtn = document.getElementById('modalCloseBtn');

// Event untuk tombol help-link
const helpLinks = document.querySelectorAll('.help-link');
helpLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    let text = this.textContent.trim().toLowerCase();
    if (text.includes('panduan')) {
      modalContent.innerHTML = modalContents.panduan;
    } else if (text.includes('faq')) {
      modalContent.innerHTML = modalContents.faq;
    } else if (text.includes('kontak') || text.includes('hubungi')) {
      modalContent.innerHTML = modalContents.kontak;
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
});

// Event untuk close modal
modalCloseBtn.addEventListener('click', function() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
});

// Tutup modal jika klik di luar konten
window.addEventListener('click', function(e) {
  if (e.target === modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}); 