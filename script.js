// Global variables
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let isPanning = false;
let isRightClickPanning = false;
let dragStartX = 0;
let dragStartY = 0;
let selectedElement = null;
let images = [];

// DOM elements
const canvas = document.getElementById('canvas');
const canvasContainer = document.getElementById('canvas-container');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetViewBtn = document.getElementById('resetView');
const zoomLevel = document.getElementById('zoomLevel');

// Initialize the application
function init() {
    loadFromLocalStorage();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Paste event for images
    document.addEventListener('paste', handlePaste);
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => zoom(1.2));
    zoomOutBtn.addEventListener('click', () => zoom(0.8));
    resetViewBtn.addEventListener('click', resetView);
    
    // Mouse events for dragging and panning
    canvasContainer.addEventListener('mousemove', handleMouseMove);
    canvasContainer.addEventListener('mouseup', handleMouseUp);
    canvasContainer.addEventListener('mouseleave', handleMouseUp);
    canvasContainer.addEventListener('mousedown', handleMouseDown);
    canvasContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Mouse wheel zoom
    canvasContainer.addEventListener('wheel', handleWheel);
    
    // Touch events for mobile
    canvasContainer.addEventListener('touchstart', handleTouchStart);
    canvasContainer.addEventListener('touchmove', handleTouchMove);
    canvasContainer.addEventListener('touchend', handleTouchEnd);
    
    // Window resize
    window.addEventListener('resize', saveToLocalStorage);
    
    // Save state periodically
    setInterval(saveToLocalStorage, 5000);
}

// Handle image paste
function handlePaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            
            reader.onload = function(event) {
                addImageToCanvas(event.target.result);
            };
            
            reader.readAsDataURL(blob);
        }
    }
}

// Add image to canvas
function addImageToCanvas(src) {
    const img = new Image();
    img.src = src;
    
    img.onload = function() {
        const imgElement = document.createElement('img');
        imgElement.src = src;
        imgElement.className = 'image-element';
        
        // Set initial position
        const rect = canvas.getBoundingClientRect();
        const x = (rect.width / 2 - img.width / 2) / scale - offsetX;
        const y = (rect.height / 2 - img.height / 2) / scale - offsetY;
        
        imgElement.style.left = `${x}px`;
        imgElement.style.top = `${y}px`;
        
        // Add drag functionality
        imgElement.addEventListener('mousedown', startElementDrag);
        imgElement.addEventListener('touchstart', handleElementTouchStart);
        
        canvas.appendChild(imgElement);
        
        // Store image data
        const imageData = {
            src: src,
            x: x,
            y: y,
            id: Date.now() + Math.random()
        };
        
        images.push(imageData);
        saveToLocalStorage();
    };
}

// Image dragging
function startElementDrag(e) {
    e.stopPropagation();
    selectedElement = e.target;
    isDragging = true;
    
    // Store the initial position of the element
    const initialX = parseFloat(selectedElement.style.left);
    const initialY = parseFloat(selectedElement.style.top);
    
    // Store the start positions
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    selectedElement.dataset.initialX = initialX;
    selectedElement.dataset.initialY = initialY;
    
    selectedElement.style.cursor = 'grabbing';
}

// Mouse event handlers
function handleMouseDown(e) {
    e.preventDefault();
    
    if (e.button === 0) { // Left click
        if (e.target.classList.contains('image-element')) {
            startElementDrag(e);
        } else if (e.target === canvasContainer || e.target === document.getElementById('grid-background')) {
            // Start panning with left-click on background
            isPanning = true;
            dragStartX = e.clientX - offsetX;
            dragStartY = e.clientY - offsetY;
            canvasContainer.style.cursor = 'grabbing';
        }
    } else if (e.button === 2) { // Right click
        if (e.target === canvasContainer || e.target === document.getElementById('grid-background')) {
            isRightClickPanning = true;
            dragStartX = e.clientX - offsetX;
            dragStartY = e.clientY - offsetY;
            canvasContainer.style.cursor = 'grabbing';
        }
    }
}

function handleMouseMove(e) {
    if (isDragging && selectedElement) {
        // Dragging an element
        const deltaX = (e.clientX - dragStartX) / scale;
        const deltaY = (e.clientY - dragStartY) / scale;
        
        const initialX = parseFloat(selectedElement.dataset.initialX);
        const initialY = parseFloat(selectedElement.dataset.initialY);
        
        const x = initialX + deltaX;
        const y = initialY + deltaY;
        
        selectedElement.style.left = `${x}px`;
        selectedElement.style.top = `${y}px`;
        
        // Update stored position
        const index = images.findIndex(img => img.id === selectedElement.dataset.id);
        if (index !== -1) {
            images[index].x = x;
            images[index].y = y;
        }
    } else if (isPanning || isRightClickPanning) {
        // Panning the canvas
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
        updateCanvasTransform();
    }
}

function handleMouseUp(e) {
    if (isDragging && selectedElement) {
        selectedElement.style.cursor = 'move';
        selectedElement = null;
    }
    
    isDragging = false;
    isPanning = false;
    isRightClickPanning = false;
    canvasContainer.style.cursor = 'default';
    saveToLocalStorage();
}

// Touch event handlers
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.target === canvasContainer || touch.target === document.getElementById('grid-background')) {
            isPanning = true;
            dragStartX = touch.clientX - offsetX;
            dragStartY = touch.clientY - offsetY;
        }
    }
}

function handleTouchMove(e) {
    if (isPanning && e.touches.length === 1) {
        const touch = e.touches[0];
        offsetX = touch.clientX - dragStartX;
        offsetY = touch.clientY - dragStartY;
        updateCanvasTransform();
        e.preventDefault();
    }
}

function handleTouchEnd() {
    isPanning = false;
    saveToLocalStorage();
}

function handleElementTouchStart(e) {
    e.stopPropagation();
    selectedElement = e.target;
    
    const touch = e.touches[0];
    const rect = selectedElement.getBoundingClientRect();
    dragStartX = touch.clientX - rect.left;
    dragStartY = touch.clientY - rect.top;
}

// Zoom functionality
function zoom(factor) {
    const rect = canvasContainer.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    zoomAtPoint(factor, centerX, centerY);
}

function handleWheel(e) {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    
    zoomAtPoint(zoom, e.clientX, e.clientY);
}

function zoomAtPoint(factor, mouseX, mouseY) {
    const newScale = scale * factor;
    
    // Limit zoom scale
    if (newScale < 0.1 || newScale > 10) return;
    
    // Calculate the point in world coordinates before zoom
    const worldX = (mouseX - offsetX) / scale;
    const worldY = (mouseY - offsetY) / scale;
    
    // Apply zoom
    scale = newScale;
    
    // Calculate new offset to keep the mouse position fixed
    offsetX = mouseX - worldX * scale;
    offsetY = mouseY - worldY * scale;
    
    updateCanvasTransform();
    updateZoomLevel();
}

function resetView() {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    updateCanvasTransform();
    updateZoomLevel();
}

function updateCanvasTransform() {
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function updateZoomLevel() {
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
}

// Local storage functions
function saveToLocalStorage() {
    const state = {
        scale: scale,
        offsetX: offsetX,
        offsetY: offsetY,
        images: images
    };
    localStorage.setItem('imageCanvasState', JSON.stringify(state));
}

function loadFromLocalStorage() {
    const state = localStorage.getItem('imageCanvasState');
    if (state) {
        const parsed = JSON.parse(state);
        scale = parsed.scale || 1;
        offsetX = parsed.offsetX || 0;
        offsetY = parsed.offsetY || 0;
        images = parsed.images || [];
        
        // Restore images
        images.forEach(imageData => {
            const imgElement = document.createElement('img');
            imgElement.src = imageData.src;
            imgElement.className = 'image-element';
            imgElement.style.left = `${imageData.x}px`;
            imgElement.style.top = `${imageData.y}px`;
            imgElement.dataset.id = imageData.id;
            
            // Add drag functionality
            imgElement.addEventListener('mousedown', startElementDrag);
            imgElement.addEventListener('touchstart', handleElementTouchStart);
            
            canvas.appendChild(imgElement);
        });
        
        updateCanvasTransform();
        updateZoomLevel();
    }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);
