/**
 * Ocean Wood - Visual CMS Editor
 * Handles inline text/image edits per section, dynamic menu loading, and JSON product/project database updates.
 */

(function () {
    // Check URL parameters for admin activation/deactivation
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        sessionStorage.setItem('adminMode', 'true');
        // Clean URL to look nicer
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } else if (urlParams.get('admin') === 'false') {
        sessionStorage.setItem('adminMode', 'false');
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    const isAdmin = sessionStorage.getItem('adminMode') === 'true';

    // Double-click on footer copyright to toggle admin mode
    document.addEventListener('DOMContentLoaded', () => {
        // Load Mega Menu dynamically on page load (for all visitors)
        loadMegaMenu();
        // Load News Mega Menu dynamically on page load (for all visitors)
        loadNewsMegaMenu();
        // Load About Us Slideshow
        initAboutSlideshow();

        const footerText = Array.from(document.querySelectorAll('footer *')).find(el => 
            el.children.length === 0 && (el.textContent.includes('©') || el.textContent.includes('rights reserved') || el.textContent.includes('All rights reserved'))
        );
        if (footerText) {
            footerText.style.cursor = 'pointer';
            footerText.title = "Nhấp đúp chuột để bật/tắt Chế độ Quản trị";
            footerText.addEventListener('dblclick', () => {
                const isCurrentlyAdmin = sessionStorage.getItem('adminMode') === 'true';
                if (isCurrentlyAdmin) {
                    window.location.search = '?admin=false';
                } else {
                    window.location.search = '?admin=true';
                }
            });
        }
        
        if (isAdmin) {
            startAdminMode();
        }
    });

    // Initialize About Us Slideshow Player
    function initAboutSlideshow() {
        const container = document.getElementById('about-slideshow');
        if (!container) return;

        let slides = [];
        try {
            slides = JSON.parse(container.getAttribute('data-slides') || '[]');
        } catch (e) {
            console.error("Error parsing data-slides:", e);
        }

        if (slides.length === 0) return;

        const slidesContainer = container.querySelector('.slides-container');
        const dotsContainer = container.querySelector('.slides-dots');
        if (!slidesContainer || !dotsContainer) return;

        // Render slides
        slidesContainer.innerHTML = slides.map((url, idx) => `
            <div class="slide-item absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 ease-in-out ${idx === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" style="background-image: url('${url}');"></div>
        `).join('');

        // Render dots
        dotsContainer.innerHTML = slides.map((_, idx) => `
            <button class="slide-dot w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white'}" data-slide-idx="${idx}"></button>
        `).join('');

        let currentIdx = 0;
        let intervalId = null;

        function goToSlide(idx) {
            const slideItems = container.querySelectorAll('.slide-item');
            const dots = container.querySelectorAll('.slide-dot');
            if (slideItems.length === 0) return;

            currentIdx = (idx + slideItems.length) % slideItems.length;

            slideItems.forEach((slide, sIdx) => {
                if (sIdx === currentIdx) {
                    slide.classList.remove('opacity-0', 'z-0');
                    slide.classList.add('opacity-100', 'z-10');
                } else {
                    slide.classList.remove('opacity-100', 'z-10');
                    slide.classList.add('opacity-0', 'z-0');
                }
            });

            dots.forEach((dot, dIdx) => {
                if (dIdx === currentIdx) {
                    dot.classList.remove('bg-white/50');
                    dot.classList.add('bg-white', 'scale-125');
                } else {
                    dot.classList.remove('bg-white', 'scale-125');
                    dot.classList.add('bg-white/50');
                }
            });
        }

        function startAutoSlide() {
            stopAutoSlide();
            intervalId = setInterval(() => {
                goToSlide(currentIdx + 1);
            }, 4000);
        }

        function stopAutoSlide() {
            if (intervalId) clearInterval(intervalId);
        }

        dotsContainer.querySelectorAll('.slide-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(dot.getAttribute('data-slide-idx'));
                goToSlide(idx);
                startAutoSlide();
            });
        });

        startAutoSlide();

        container.aboutSlideshow = {
            goToSlide,
            startAutoSlide,
            stopAutoSlide,
            destroy: () => {
                stopAutoSlide();
            }
        };
    }

    // Load Mega Menu dynamic loader
    function loadMegaMenu() {
        const grid = document.getElementById('mega-menu-grid');
        if (!grid) return;

        fetch('js/menu.json?' + new Date().getTime())
            .then(res => res.json())
            .then(menu => {
                const numColumns = menu.length;
                // Automatically set grid columns based on group counts to look balanced
                grid.style.gridTemplateColumns = `repeat(${numColumns}, minmax(0, 1fr))`;
                
                grid.innerHTML = menu.map(group => `
                    <div class="flex flex-col gap-4" data-group-id="${group.id}">
                        <div class="aspect-video rounded-lg overflow-hidden relative bg-gray-100">
                            <img src="${group.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" alt="${group.title}" class="w-full h-full object-cover">
                        </div>
                        <h5 class="font-bold text-primary uppercase text-sm tracking-wider">${group.title}</h5>
                        <ul class="space-y-2">
                            ${group.links.map(link => `
                                <li><a href="${link.url || 'san-pham.html'}" class="text-sm text-on-surface-variant hover:text-primary transition-colors">${link.name}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('');
            })
            .catch(err => {
                console.error("Error loading mega menu:", err);
            });
    }

    // Main function to bootstrap admin editor
    function startAdminMode() {
        console.log("Visual CMS: Admin Mode Active");
        
        // Inject admin stylesheet
        if (!document.getElementById('admin-css')) {
            const link = document.createElement('link');
            link.id = 'admin-css';
            link.rel = 'stylesheet';
            link.href = 'js/admin.css';
            document.head.appendChild(link);
        }

        // Render Floating Admin Control Bar
        renderAdminBar();

        // Setup static elements editing (Text and static images) on a per-section level
        setupSectionBasedEditing();

        // Setup dynamic elements editing (Products and Projects)
        window.initAdminMode = setupDynamicEditing; // Export to global scope so grids can re-trigger on reload
        setupDynamicEditing();
    }

    // Toast status helper
    function showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'admin-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, duration);
    }

    // Render Floating Admin Bar
    function renderAdminBar() {
        if (document.querySelector('.admin-bar')) return;

        const bar = document.createElement('div');
        bar.className = 'admin-bar';
        bar.innerHTML = `
            <span style="font-weight: bold; color: #82C341; font-size: 14px; margin-right: 8px;">Ocean Wood Admin Mode</span>
            <button class="admin-btn-save">
                <span class="material-symbols-outlined" style="font-size: 18px;">save</span> Lưu Thay Đổi
            </button>
            <button class="admin-btn-menu" style="background:#005696; color:white; border:none;">
                <span class="material-symbols-outlined" style="font-size: 18px;">menu</span> Sửa Menu Sản Phẩm
            </button>
            <button class="admin-btn-news" style="background:#5C5F60; color:white; border:none;">
                <span class="material-symbols-outlined" style="font-size: 18px;">newspaper</span> Quản lý Tin Tức
            </button>
            <button class="admin-btn-publish">
                <span class="material-symbols-outlined" style="font-size: 18px;">cloud_upload</span> Đăng lên GitHub
            </button>
            <button class="admin-btn-exit">
                <span class="material-symbols-outlined" style="font-size: 18px;">logout</span> Thoát
            </button>
        `;

        document.body.appendChild(bar);

        // Bind events
        bar.querySelector('.admin-btn-save').addEventListener('click', saveCurrentPage);
        bar.querySelector('.admin-btn-menu').addEventListener('click', openMenuManagerModal);
        bar.querySelector('.admin-btn-news').addEventListener('click', openNewsManagerModal);
        bar.querySelector('.admin-btn-publish').addEventListener('click', publishToGithub);
        bar.querySelector('.admin-btn-exit').addEventListener('click', () => {
            window.location.search = '?admin=false';
        });
    }

    // Section-based inline editing logic
    function setupSectionBasedEditing() {
        // Query all major sections: header, footer, and main blocks
        const sections = document.querySelectorAll('main > section, main > div, body > section, header, footer');
        
        sections.forEach(section => {
            // Skip admin UI elements
            if (section.closest('.admin-bar') || section.closest('.admin-modal') || section.id === 'mobile-menu') {
                return;
            }

            // Ensure section has relative positioning for the edit button
            section.classList.add('admin-relative-block');

            // Skip if the block already has an edit button
            if (section.querySelector('.admin-block-edit-btn')) return;

            // Create edit button for this block/section
            const editBtn = document.createElement('button');
            editBtn.className = 'admin-block-edit-btn';
            editBtn.title = 'Chỉnh sửa phần này';
            editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
            section.appendChild(editBtn);

            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isEditing = editBtn.classList.contains('active');
                if (isEditing) {
                    // Turn off editing for this block
                    disableSectionEditing(section, editBtn);
                } else {
                    // Turn on editing for this block
                    enableSectionEditing(section, editBtn);
                }
            });
        });
    }

    // Enable editing in a specific section
    function enableSectionEditing(section, editBtn) {
        editBtn.classList.add('active');
        editBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        editBtn.title = 'Hoàn tất sửa phần này';

        // 1. Make text elements editable
        const textSelectors = 'h1, h2, h3, h4, h5, h6, p, span, li, a';
        section.querySelectorAll(textSelectors).forEach(el => {
            // Skip elements inside product or project cards (they are database items edited by form modals)
            // Skip elements inside the mega-menu (which is handled by the dedicated Menu Modal)
            if (el.closest('.product-card') || el.closest('.project-card') || el.closest('.admin-bar') || el.closest('.admin-modal') || el.closest('#inquiry-modal') || el.closest('#mega-menu-grid')) {
                return;
            }
            // Skip icons and buttons
            if (el.classList.contains('material-symbols-outlined') || el.tagName === 'BUTTON' || el.closest('button')) {
                return;
            }

            el.setAttribute('contenteditable', 'true');
        });

        // 2. Make image elements editable
        section.querySelectorAll('img').forEach(img => {
            // Skip product/project cards, admin UI, mega-menu, and small icons
            if (img.closest('.product-card') || img.closest('.project-card') || img.closest('.admin-bar') || img.closest('.admin-modal') || img.closest('#mega-menu-grid') || img.height <= 20) {
                return;
            }
            if (img.parentElement.classList.contains('admin-image-container')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'admin-image-container display-inline-block w-full h-full';
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);

            const overlay = document.createElement('div');
            overlay.className = 'admin-image-overlay';
            overlay.innerHTML = '<span><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">image</span> Thay Ảnh</span>';
            wrapper.appendChild(overlay);

            overlay.addEventListener('click', () => {
                chooseAndUploadImage(uploadedUrl => {
                    img.src = uploadedUrl;
                    showToast("Đã cập nhật ảnh tĩnh thành công!");
                });
            });
        });

        // 3. Make background-image elements editable
        section.querySelectorAll('[style*="background-image"]').forEach(bgEl => {
            // Skip product/project cards, admin UI, mega-menu, and slideshow slides!
            if (bgEl.closest('.product-card') || bgEl.closest('.project-card') || bgEl.closest('.admin-bar') || bgEl.closest('.admin-modal') || bgEl.closest('#mega-menu-grid') || bgEl.closest('#about-slideshow')) {
                return;
            }
            if (bgEl.parentElement.classList.contains('admin-image-container')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'admin-image-container display-inline-block w-full h-full';
            bgEl.parentNode.insertBefore(wrapper, bgEl);
            wrapper.appendChild(bgEl);

            const overlay = document.createElement('div');
            overlay.className = 'admin-image-overlay';
            overlay.innerHTML = '<span><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">image</span> Thay Ảnh</span>';
            wrapper.appendChild(overlay);

            overlay.addEventListener('click', () => {
                chooseAndUploadImage(uploadedUrl => {
                    bgEl.style.backgroundImage = `url("${uploadedUrl}")`;
                    showToast("Đã cập nhật ảnh nền thành công!");
                });
            });
        });

        // 4. If section contains about-slideshow, add slideshow manager overlay
        if (section.querySelector('#about-slideshow')) {
            const slideshow = section.querySelector('#about-slideshow');
            if (!slideshow.querySelector('.admin-slideshow-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'admin-slideshow-overlay';
                overlay.innerHTML = '<span><span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">photo_library</span> Quản lý slide ảnh</span>';
                slideshow.appendChild(overlay);

                overlay.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openSlideshowManagerModal(slideshow);
                });
            }
        }

        showToast("Đã bật chế độ chỉnh sửa cho phần này.");
    }

    // Disable editing in a specific section
    function disableSectionEditing(section, editBtn) {
        editBtn.classList.remove('active');
        editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
        editBtn.title = 'Chỉnh sửa phần này';

        // 1. Remove contenteditable
        section.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.removeAttribute('contenteditable');
        });

        // 2. Unwrap images (both img and background-image divs)
        section.querySelectorAll('.admin-image-container').forEach(wrapper => {
            const child = wrapper.firstElementChild;
            const parent = wrapper.parentNode;
            if (child && parent) {
                parent.insertBefore(child, wrapper);
                wrapper.remove();
            }
        });

        // 3. Remove slideshow overlay
        const ssOverlay = section.querySelector('.admin-slideshow-overlay');
        if (ssOverlay) ssOverlay.remove();

        showToast("Đã đóng chế độ chỉnh sửa phần này.");
    }

    // Helper: Select image file and upload to local server
    function chooseAndUploadImage(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64 = event.target.result;
                showToast("Đang tải ảnh lên máy chủ...");

                fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        base64: base64
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        callback(data.image_url);
                    } else {
                        alert("Lỗi tải ảnh: " + data.message);
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert("Lỗi kết nối máy chủ local. Đảm bảo server đang chạy!");
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    // Setup Dynamic Grid Editors (Products and Projects)
    function setupDynamicEditing() {
        // --- 1. PROJECTS (du-an.html) ---
        const projectCards = document.querySelectorAll('.project-card');
        if (projectCards.length > 0) {
            projectCards.forEach(card => {
                if (card.querySelector('.admin-card-controls')) return;

                const projId = card.getAttribute('data-project-id');
                const controls = document.createElement('div');
                controls.className = 'admin-card-controls';
                controls.innerHTML = `
                    <button class="admin-card-btn admin-card-btn-edit" title="Sửa dự án">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                    </button>
                    <button class="admin-card-btn admin-card-btn-delete" title="Xóa dự án">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                    </button>
                `;
                card.appendChild(controls);

                controls.querySelector('.admin-card-btn-edit').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openProjectModal(projId);
                });

                controls.querySelector('.admin-card-btn-delete').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteProject(projId);
                });
            });

            // Add new project button at heading
            const heading = document.querySelector('h2.font-headline-lg');
            if (heading && !document.getElementById('admin-add-project-btn')) {
                const addBtn = document.createElement('button');
                addBtn.id = 'admin-add-project-btn';
                addBtn.className = 'mt-4 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all mx-auto block flex items-center gap-2';
                addBtn.innerHTML = '<span class="material-symbols-outlined">add_circle</span> Thêm Dự Án Mới';
                heading.parentNode.appendChild(addBtn);
                addBtn.addEventListener('click', () => openProjectModal(null));
            }
        }

        // --- 2. PRODUCTS (san-pham.html) ---
        const productCards = document.querySelectorAll('.product-card');
        if (productCards.length > 0) {
            productCards.forEach(card => {
                if (card.querySelector('.admin-card-controls')) return;

                const prodId = card.getAttribute('data-product-id');
                const controls = document.createElement('div');
                controls.className = 'admin-card-controls';
                controls.innerHTML = `
                    <button class="admin-card-btn admin-card-btn-edit" title="Sửa sản phẩm">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                    </button>
                    <button class="admin-card-btn admin-card-btn-delete" title="Xóa sản phẩm">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                    </button>
                `;
                card.appendChild(controls);

                controls.querySelector('.admin-card-btn-edit').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openProductModal(prodId);
                });

                controls.querySelector('.admin-card-btn-delete').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteProduct(prodId);
                });
            });

            // Add new product button next to category filters (or heading)
            const heading = document.querySelector('h3.text-primary') || document.querySelector('h2');
            if (heading && !document.getElementById('admin-add-product-btn')) {
                const addBtn = document.createElement('button');
                addBtn.id = 'admin-add-product-btn';
                addBtn.className = 'mb-6 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center gap-2';
                addBtn.innerHTML = '<span class="material-symbols-outlined">add_circle</span> Thêm Sản Phẩm Mới';
                heading.parentNode.insertBefore(addBtn, heading);
                addBtn.addEventListener('click', () => openProductModal(null));
            }
        }
    }

    // Modal Form Creators
    function createModalContainer() {
        const existing = document.querySelector('.admin-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        document.body.appendChild(modal);
        return modal;
    }

    // PROJECT: Add/Edit Modal
    function openProjectModal(id = null) {
        fetch('js/projects.json?' + new Date().getTime())
            .then(res => res.json())
            .then(projects => {
                const project = id ? projects.find(p => p.id == id) : { name: '', location: '', image_url: '' };
                if (!project) return;

                const modal = createModalContainer();
                modal.innerHTML = `
                    <div class="admin-modal-content">
                        <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 18px; margin-bottom: 16px;">${id ? 'Sửa Dự Án' : 'Thêm Dự Án Mới'}</h3>
                        <form id="admin-project-form" class="space-y-4" style="display: flex; flex-direction: column; gap: 12px;">
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Tên dự án *</label>
                                <input type="text" id="proj-name" required value="${project.name}" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Địa điểm *</label>
                                <input type="text" id="proj-location" required value="${project.location}" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Hình ảnh dự án</label>
                                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                                    <img id="proj-img-preview" src="${project.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 80px; height: 50px; object-fit: contain; border: 1px solid #E5E7EB;">
                                    <button type="button" id="proj-upload-btn" style="background:#F3F4F6; color:#374151; border:1px solid #D1D5DB; padding:6px 12px; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">Tải ảnh từ máy...</button>
                                </div>
                                <input type="hidden" id="proj-img-url" value="${project.image_url}">
                            </div>
                            <div style="display:flex; justify-content: flex-end; gap:8px; margin-top: 16px;">
                                <button type="button" id="proj-cancel-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Hủy</button>
                                <button type="submit" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Lưu</button>
                            </div>
                        </form>
                    </div>
                `;

                // Handle Image Upload inside modal
                modal.querySelector('#proj-upload-btn').addEventListener('click', () => {
                    chooseAndUploadImage(url => {
                        modal.querySelector('#proj-img-preview').src = url;
                        modal.querySelector('#proj-img-url').value = url;
                    });
                });

                // Cancel button
                modal.querySelector('#proj-cancel-btn').addEventListener('click', () => modal.remove());

                // Form submit
                modal.querySelector('#admin-project-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const name = modal.querySelector('#proj-name').value;
                    const location = modal.querySelector('#proj-location').value;
                    const image_url = modal.querySelector('#proj-img-url').value;

                    if (id) {
                        project.name = name;
                        project.location = location;
                        project.image_url = image_url;
                    } else {
                        const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
                        projects.push({ id: newId, name, location, image_url });
                    }

                    // Save projects array
                    saveJsonData('js/projects.json', projects, () => {
                        modal.remove();
                        showToast("Đã lưu dự án thành công!");
                        if (typeof loadProjects === 'function') loadProjects();
                    });
                });
            });
    }

    // PROJECT: Delete
    function deleteProject(id) {
        if (!confirm("Bạn có chắc chắn muốn xóa dự án này?")) return;

        fetch('js/projects.json?' + new Date().getTime())
            .then(res => res.json())
            .then(projects => {
                const updated = projects.filter(p => p.id != id);
                saveJsonData('js/projects.json', updated, () => {
                    showToast("Đã xóa dự án!");
                    if (typeof loadProjects === 'function') loadProjects();
                });
            });
    }

    // PRODUCT: Add/Edit Modal
    function openProductModal(id = null) {
        fetch('js/products.json?' + new Date().getTime())
            .then(res => res.json())
            .then(products => {
                const product = id ? products.find(p => p.id == id) : { name: '', category: 'plywood', image_url: '', description: '', badge: '', specs: {} };
                if (!product) return;

                const specs = product.specs || {};
                const specFields = Object.entries(specs).map(([k, v]) => `
                    <div class="spec-row" style="display:flex; gap:6px; margin-bottom:6px;">
                        <input type="text" class="spec-key" placeholder="Thuộc tính" value="${k}" style="flex:1; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                        <input type="text" class="spec-value" placeholder="Giá trị" value="${v}" style="flex:1; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                        <button type="button" class="spec-remove-btn" style="background:transparent; color:#EF4444; border:none; cursor:pointer;"><span class="material-symbols-outlined" style="font-size: 18px;">remove_circle</span></button>
                    </div>
                `).join('');

                const modal = createModalContainer();
                modal.innerHTML = `
                    <div class="admin-modal-content">
                        <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 18px; margin-bottom: 16px;">${id ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
                        <form id="admin-product-form" class="space-y-4" style="display: flex; flex-direction: column; gap: 12px;">
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Tên sản phẩm *</label>
                                <input type="text" id="prod-name" required value="${product.name}" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Danh mục *</label>
                                <select id="prod-category" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px; background:white;">
                                    <option value="plywood" ${product.category === 'plywood' ? 'selected' : ''}>Plywood</option>
                                    <option value="veneer" ${product.category === 'veneer' ? 'selected' : ''}>Veneer</option>
                                    <option value="melamine" ${product.category === 'melamine' ? 'selected' : ''}>Melamine</option>
                                    <option value="rubber" ${product.category === 'rubber' ? 'selected' : ''}>Gỗ Cao Su Ghép</option>
                                    <option value="mdf" ${product.category === 'mdf' ? 'selected' : ''}>Ván MDF - PB</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Nhãn đặc biệt (Badge)</label>
                                <input type="text" id="prod-badge" value="${product.badge || ''}" placeholder="Ví dụ: Bestseller, New, Premium..." style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Mô tả sản phẩm</label>
                                <textarea id="prod-description" rows="3" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px; font-family:inherit;">${product.description || ''}</textarea>
                            </div>
                            <div>
                                <label style="display:block; font-weight: 600; margin-bottom: 4px; font-size: 14px;">Hình ảnh sản phẩm</label>
                                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                                    <img id="prod-img-preview" src="${product.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 60px; height: 60px; object-fit: contain; border: 1px solid #E5E7EB;">
                                    <button type="button" id="prod-upload-btn" style="background:#F3F4F6; color:#374151; border:1px solid #D1D5DB; padding:6px 12px; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">Tải ảnh từ máy...</button>
                                </div>
                                <input type="hidden" id="prod-img-url" value="${product.image_url}">
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <label style="font-weight: 600; font-size: 14px;">Thông số kỹ thuật</label>
                                    <button type="button" id="add-spec-field-btn" style="background:#005696; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">+ Thêm dòng</button>
                                </div>
                                <div id="specs-fields-container">
                                    ${specFields}
                                </div>
                            </div>
                            <div style="display:flex; justify-content: flex-end; gap:8px; margin-top: 16px;">
                                <button type="button" id="prod-cancel-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Hủy</button>
                                <button type="submit" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Lưu</button>
                            </div>
                        </form>
                    </div>
                `;

                const specsContainer = modal.querySelector('#specs-fields-container');

                // Dynamic spec field bindings
                modal.querySelector('#add-spec-field-btn').addEventListener('click', () => {
                    const row = document.createElement('div');
                    row.className = 'spec-row';
                    row.style.display = 'flex';
                    row.style.gap = '6px';
                    row.style.marginBottom = '6px';
                    row.innerHTML = `
                        <input type="text" class="spec-key" placeholder="Thuộc tính" style="flex:1; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                        <input type="text" class="spec-value" placeholder="Giá trị" style="flex:1; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                        <button type="button" class="spec-remove-btn" style="background:transparent; color:#EF4444; border:none; cursor:pointer;"><span class="material-symbols-outlined" style="font-size: 18px;">remove_circle</span></button>
                    `;
                    specsContainer.appendChild(row);
                    row.querySelector('.spec-remove-btn').addEventListener('click', () => row.remove());
                });

                specsContainer.querySelectorAll('.spec-remove-btn').forEach(btn => {
                    btn.addEventListener('click', () => btn.closest('.spec-row').remove());
                });

                // Image upload inside modal
                modal.querySelector('#prod-upload-btn').addEventListener('click', () => {
                    chooseAndUploadImage(url => {
                        modal.querySelector('#prod-img-preview').src = url;
                        modal.querySelector('#prod-img-url').value = url;
                    });
                });

                modal.querySelector('#prod-cancel-btn').addEventListener('click', () => modal.remove());

                // Form submit
                modal.querySelector('#admin-product-form').addEventListener('submit', (e) => {
                    e.preventDefault();

                    const name = modal.querySelector('#prod-name').value;
                    const category = modal.querySelector('#prod-category').value;
                    const description = modal.querySelector('#prod-description').value;
                    const badge = modal.querySelector('#prod-badge').value;
                    const image_url = modal.querySelector('#prod-img-url').value;

                    // Parse specs key values
                    const updatedSpecs = {};
                    specsContainer.querySelectorAll('.spec-row').forEach(row => {
                        const key = row.querySelector('.spec-key').value.trim();
                        const val = row.querySelector('.spec-value').value.trim();
                        if (key && val) {
                            updatedSpecs[key] = val;
                        }
                    });

                    if (id) {
                        product.name = name;
                        product.category = category;
                        product.description = description;
                        product.badge = badge;
                        product.image_url = image_url;
                        product.specs = updatedSpecs;
                    } else {
                        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
                        products.push({ id: newId, name, category, description, badge, image_url, specs: updatedSpecs });
                    }

                    // Save products array
                    saveJsonData('js/products.json', products, () => {
                        modal.remove();
                        showToast("Đã lưu sản phẩm thành công!");
                        
                        // Check if we are on the products page and reload products
                        if (typeof loadProducts === 'function') {
                            // Fetch active category filtering from current UI state
                            const activeBtn = document.querySelector('aside button.bg-primary');
                            let activeCat = null;
                            if (activeBtn) {
                                const catText = activeBtn.textContent.trim().toLowerCase();
                                if (catText.includes('ván ép') || catText.includes('plywood')) activeCat = 'plywood';
                                else if (catText.includes('veneer')) activeCat = 'veneer';
                                else if (catText.includes('melamine')) activeCat = 'melamine';
                                else if (catText.includes('cao su')) activeCat = 'rubber';
                                else if (catText.includes('mdf')) activeCat = 'mdf';
                            }
                            loadProducts(activeCat);
                        }
                    });
                });
            });
    }

    // PRODUCT: Delete
    function deleteProduct(id) {
        if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

        fetch('js/products.json?' + new Date().getTime())
            .then(res => res.json())
            .then(products => {
                const updated = products.filter(p => p.id != id);
                saveJsonData('js/products.json', updated, () => {
                    showToast("Đã xóa sản phẩm!");
                    if (typeof loadProducts === 'function') loadProducts();
                });
            });
    }

    // MEGA MENU: Edit Modal Manager
    function openMenuManagerModal() {
        fetch('js/menu.json?' + new Date().getTime())
            .then(res => res.json())
            .then(menu => {
                const modal = createModalContainer();
                modal.innerHTML = `
                    <div class="admin-modal-content" style="max-width: 850px; width: 95vw;">
                        <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 18px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">Quản Lý Nhóm Sản Phẩm & Mega Menu</h3>
                        <div id="menu-groups-container" style="display: flex; flex-direction: column; gap: 24px; max-height: 60vh; overflow-y: auto; padding-right: 8px; margin-bottom: 16px;">
                            <!-- Groups list loaded here -->
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #E5E7EB; padding-top: 16px;">
                            <button type="button" id="menu-add-group-btn" style="background:#82C341; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">add_circle</span> Thêm nhóm sản phẩm
                            </button>
                            <div style="display:flex; gap:8px;">
                                <button type="button" id="menu-cancel-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Hủy</button>
                                <button type="button" id="menu-save-btn" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Lưu Menu</button>
                            </div>
                        </div>
                    </div>
                `;

                const container = modal.querySelector('#menu-groups-container');

                function renderGroups() {
                    container.innerHTML = menu.map((group, groupIdx) => {
                        const links = group.links || [];
                        const linksHtml = links.map((link, linkIdx) => `
                            <div class="link-row" data-link-idx="${linkIdx}" style="display:flex; gap:8px; align-items:center; margin-bottom: 6px;">
                                <input type="text" class="link-name" placeholder="Tên sản phẩm (Ví dụ: Tủ bếp)" value="${link.name}" style="flex: 2; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                                <input type="text" class="link-url" placeholder="Đường dẫn liên kết (Mặc định: san-pham.html)" value="${link.url || 'san-pham.html'}" style="flex: 3; border: 1px solid #c1c7d2; padding: 6px; border-radius: 4px; font-size:13px;">
                                <button type="button" class="link-delete-btn" style="background:transparent; color:#EF4444; border:none; cursor:pointer; padding: 2px;" title="Xóa liên kết">
                                    <span class="material-symbols-outlined" style="font-size:18px; vertical-align: middle;">remove_circle</span>
                                </button>
                            </div>
                        `).join('');

                        return `
                            <div class="menu-group-card" data-idx="${groupIdx}" style="border: 1px solid #D1D5DB; border-radius: 8px; padding: 16px; background: #F9FAFB; position: relative;">
                                <button type="button" class="group-delete-btn" style="position: absolute; top: 12px; right: 12px; background: transparent; color: #EF4444; border: none; cursor: pointer;" title="Xóa nhóm này">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 16px; margin-bottom: 12px;">
                                    <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
                                        <img class="group-img-preview" src="${group.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 100px; height: 60px; object-fit: cover; border: 1px solid #D1D5DB; border-radius:4px; background:white;">
                                        <button type="button" class="group-upload-btn" style="background:#E5E7EB; color:#374151; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer; margin-top:4px;">Đổi ảnh</button>
                                        <input type="hidden" class="group-img-url" value="${group.image_url || ''}">
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:8px;">
                                        <label style="font-weight: 600; font-size: 13px;">Tên nhóm sản phẩm (Ví dụ: Ván Ép / Plywood) *</label>
                                        <input type="text" class="group-title" required value="${group.title}" style="width:100%; border: 1px solid #c1c7d2; padding: 8px; border-radius: 4px; font-size:14px;">
                                    </div>
                                </div>
                                <div style="margin-top: 12px; border-top: 1px dashed #D1D5DB; padding-top: 12px;">
                                    <label style="font-weight: 600; font-size: 13px; display:block; margin-bottom: 8px;">Danh sách sản phẩm trong nhóm:</label>
                                    <div class="group-links-container">
                                        ${linksHtml}
                                    </div>
                                    <button type="button" class="group-add-link-btn" style="background:transparent; color:#005696; border:none; padding:6px 0; font-weight:600; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:2px; margin-top:4px;">
                                        <span class="material-symbols-outlined" style="font-size:16px;">add</span> Thêm sản phẩm cụ thể
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('');

                    // Attach events to newly rendered inputs/buttons
                    container.querySelectorAll('.menu-group-card').forEach(card => {
                        const gIdx = parseInt(card.getAttribute('data-idx'));

                        // Delete whole group
                        card.querySelector('.group-delete-btn').addEventListener('click', () => {
                            if (confirm(`Bạn có chắc muốn xóa nhóm "${menu[gIdx].title || 'này'}" và toàn bộ sản phẩm bên trong?`)) {
                                menu.splice(gIdx, 1);
                                renderGroups();
                            }
                        });

                        // Image upload for group
                        card.querySelector('.group-upload-btn').addEventListener('click', () => {
                            chooseAndUploadImage(url => {
                                card.querySelector('.group-img-preview').src = url;
                                card.querySelector('.group-img-url').value = url;
                                menu[gIdx].image_url = url;
                            });
                        });

                        // Sync Title
                        card.querySelector('.group-title').addEventListener('input', (e) => {
                            menu[gIdx].title = e.target.value;
                        });

                        // Sync Links Input Values
                        card.querySelectorAll('.link-row').forEach(row => {
                            const lIdx = parseInt(row.getAttribute('data-link-idx'));
                            row.querySelector('.link-name').addEventListener('input', (e) => {
                                menu[gIdx].links[lIdx].name = e.target.value;
                            });
                            row.querySelector('.link-url').addEventListener('input', (e) => {
                                menu[gIdx].links[lIdx].url = e.target.value;
                            });
                            row.querySelector('.link-delete-btn').addEventListener('click', () => {
                                menu[gIdx].links.splice(lIdx, 1);
                                renderGroups();
                            });
                        });

                        // Add link to group
                        card.querySelector('.group-add-link-btn').addEventListener('click', () => {
                            if (!menu[gIdx].links) menu[gIdx].links = [];
                            menu[gIdx].links.push({ name: '', url: 'san-pham.html' });
                            renderGroups();
                        });
                    });
                }

                renderGroups();

                // Add new group
                modal.querySelector('#menu-add-group-btn').addEventListener('click', () => {
                    const newId = menu.length > 0 ? Math.max(...menu.map(g => g.id)) + 1 : 1;
                    menu.push({
                        id: newId,
                        title: 'Nhóm sản phẩm mới',
                        image_url: '',
                        links: []
                    });
                    renderGroups();
                });

                // Cancel
                modal.querySelector('#menu-cancel-btn').addEventListener('click', () => modal.remove());

                // Save
                modal.querySelector('#menu-save-btn').addEventListener('click', () => {
                    // Check validation
                    const emptyTitle = menu.some(g => !g.title || g.title.trim() === '');
                    if (emptyTitle) {
                        alert("Vui lòng điền đầy đủ tên cho tất cả các nhóm sản phẩm!");
                        return;
                    }

                    saveJsonData('js/menu.json', menu, () => {
                        modal.remove();
                        showToast("Đã lưu cấu hình menu sản phẩm thành công!");
                        loadMegaMenu();
                    });
                });
            });
    }

    // Server Save API Helpers
    function saveJsonData(file, data, callback) {
        fetch('/api/save-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file, data })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === 'success') {
                callback();
            } else {
                alert("Lỗi khi lưu dữ liệu JSON: " + resData.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi kết nối máy chủ local. Đảm bảo server đang chạy!");
        });
    }

    // SAVE HTML PAGE (Static text content)
    function saveCurrentPage() {
        const saveBtn = document.querySelector('.admin-btn-save');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Đang lưu...';

        // 1. Disable editing in all sections to clean HTML
        document.querySelectorAll('main > section, main > div, body > section, header, footer').forEach(section => {
            // Remove contenteditable
            section.querySelectorAll('[contenteditable="true"]').forEach(el => {
                el.removeAttribute('contenteditable');
            });
            // Unwrap images (both img and background-image divs)
            section.querySelectorAll('.admin-image-container').forEach(wrapper => {
                const child = wrapper.firstElementChild;
                const parent = wrapper.parentNode;
                if (child && parent) {
                    parent.insertBefore(child, wrapper);
                    wrapper.remove();
                }
            });
        });

        // 2. Temporarily remove admin elements
        const adminBar = document.querySelector('.admin-bar');
        const adminCss = document.getElementById('admin-css');
        
        // Remove slideshow overlays
        document.querySelectorAll('.admin-slideshow-overlay').forEach(el => el.remove());
        const addProjectBtn = document.getElementById('admin-add-project-btn');
        const addProductBtn = document.getElementById('admin-add-product-btn');
        const blockEditBtns = document.querySelectorAll('.admin-block-edit-btn');
        
        if (adminBar) adminBar.remove();
        if (adminCss) adminCss.remove();
        if (addProjectBtn) addProjectBtn.remove();
        if (addProductBtn) addProductBtn.remove();
        blockEditBtns.forEach(btn => btn.remove());

        // Remove card overlay controls
        document.querySelectorAll('.admin-card-controls').forEach(ctrl => ctrl.remove());

        // Grab cleaned HTML string
        // Get the filename from pathname
        let filename = window.location.pathname.split('/').pop();
        if (!filename || filename === '') {
            filename = 'index.html';
        }

        const cleanedHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

        // Restore admin layout for editing immediately after capturing the HTML
        if (isAdmin) {
            setTimeout(startAdminMode, 100);
        }

        // Send cleaned HTML back to local server
        fetch('/api/save-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: filename,
                html: cleanedHtml
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                showToast("Đã lưu trang tĩnh thành công vào file!");
            } else {
                alert("Lỗi khi lưu tệp HTML: " + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi kết nối máy chủ local. Đảm bảo server đang chạy!");
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        });
    }

    // GIT PUBLISH: Commit and push changes
    function publishToGithub() {
        const pubBtn = document.querySelector('.admin-btn-publish');
        const originalText = pubBtn.innerHTML;
        pubBtn.disabled = true;
        pubBtn.innerHTML = 'Đang xuất bản...';

        showToast("Đang đồng bộ và đẩy mã nguồn lên GitHub...");

        fetch('/api/git-publish', {
            method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Thành công! Website mới nhất đã được đẩy lên GitHub và sẽ hoạt động trên Cloudflare trong 30 giây.");
            } else {
                alert("Lỗi xuất bản GitHub: " + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Lỗi kết nối máy chủ local. Đảm bảo server đang chạy!");
        })
        .finally(() => {
            pubBtn.disabled = false;
            pubBtn.innerHTML = originalText;
        });
    }

    // Slideshow Manager Modal
    function openSlideshowManagerModal(slideshow) {
        let slides = [];
        try {
            slides = JSON.parse(slideshow.getAttribute('data-slides') || '[]');
        } catch (e) {
            console.error("Error parsing data-slides:", e);
        }

        const modal = createModalContainer();
        modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 550px; width: 90vw;">
                <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 18px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">Quản Lý Slideshow Về Chúng Tôi</h3>
                <div id="slideshow-list-container" style="display: flex; flex-direction: column; gap: 12px; max-height: 50vh; overflow-y: auto; padding-right: 8px; margin-bottom: 16px;">
                    <!-- Slides list loaded here -->
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #E5E7EB; padding-top: 16px;">
                    <button type="button" id="ss-add-btn" style="background:#82C341; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">add_circle</span> Thêm ảnh slide
                    </button>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="ss-cancel-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Hủy</button>
                        <button type="button" id="ss-save-btn" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Lưu slide</button>
                    </div>
                </div>
            </div>
        `;

        const listContainer = modal.querySelector('#slideshow-list-container');

        function renderSlides() {
            if (slides.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; color:#6B7280; padding:16px;">Không có hình ảnh nào. Vui lòng thêm ảnh mới.</p>`;
                return;
            }

            listContainer.innerHTML = slides.map((url, idx) => `
                <div class="ss-item-row" data-idx="${idx}" style="display:flex; gap:12px; align-items:center; border:1px solid #E5E7EB; padding:10px; border-radius:8px; background:#F9FAFB;">
                    <img src="${url}" style="width: 80px; height: 50px; object-fit: cover; border: 1px solid #D1D5DB; border-radius:4px; background:white;">
                    <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; color:#4B5563;">
                        ${url.split('/').pop().substring(0, 30)}
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="ss-move-up" style="background:transparent; border:none; cursor:pointer; color:#4B5563; display:flex; align-items:center;" title="Di chuyển lên" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>
                            <span class="material-symbols-outlined" style="font-size:18px;">arrow_upward</span>
                        </button>
                        <button type="button" class="ss-move-down" style="background:transparent; border:none; cursor:pointer; color:#4B5563; display:flex; align-items:center;" title="Di chuyển xuống" ${idx === slides.length - 1 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>
                            <span class="material-symbols-outlined" style="font-size:18px;">arrow_downward</span>
                        </button>
                        <button type="button" class="ss-delete" style="background:transparent; border:none; cursor:pointer; color:#EF4444; display:flex; align-items:center;" title="Xóa ảnh này">
                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');

            listContainer.querySelectorAll('.ss-item-row').forEach(row => {
                const idx = parseInt(row.getAttribute('data-idx'));

                const btnUp = row.querySelector('.ss-move-up');
                if (btnUp && idx > 0) {
                    btnUp.addEventListener('click', () => {
                        const temp = slides[idx];
                        slides[idx] = slides[idx - 1];
                        slides[idx - 1] = temp;
                        renderSlides();
                    });
                }

                const btnDown = row.querySelector('.ss-move-down');
                if (btnDown && idx < slides.length - 1) {
                    btnDown.addEventListener('click', () => {
                        const temp = slides[idx];
                        slides[idx] = slides[idx + 1];
                        slides[idx + 1] = temp;
                        renderSlides();
                    });
                }

                row.querySelector('.ss-delete').addEventListener('click', () => {
                    slides.splice(idx, 1);
                    renderSlides();
                });
            });
        }

        renderSlides();

        modal.querySelector('#ss-add-btn').addEventListener('click', () => {
            chooseAndUploadImage(url => {
                slides.push(url);
                renderSlides();
            });
        });

        modal.querySelector('#ss-cancel-btn').addEventListener('click', () => modal.remove());

        modal.querySelector('#ss-save-btn').addEventListener('click', () => {
            slideshow.setAttribute('data-slides', JSON.stringify(slides));
            if (slideshow.aboutSlideshow) {
                slideshow.aboutSlideshow.destroy();
            }
            initAboutSlideshow();
            modal.remove();
            showToast("Đã lưu và cập nhật Slideshow!");
        });
    }

    // Load News Mega Menu for all visitors
    function loadNewsMegaMenu() {
        const grids = document.querySelectorAll('#news-mega-menu-grid');
        if (grids.length === 0) return;

        fetch('js/news.json?' + new Date().getTime())
            .then(res => res.json())
            .then(categories => {
                const html = categories.map(cat => {
                    const count = cat.articles.length;
                    const topArticles = cat.articles.slice(0, 4);
                    const linksHtml = topArticles.map(art => `
                        <li>
                            <a href="chi-tiet-tin-tuc.html?id=${art.id}" class="text-sm text-on-surface-variant hover:text-primary transition-colors line-clamp-1 py-0.5 block">
                                ${art.title}
                            </a>
                        </li>
                    `).join('');

                    return `
                        <div class="flex flex-col gap-3" data-category-id="${cat.id}">
                            <a href="tin-tuc.html?category=${cat.id}" class="aspect-[16/10] rounded-lg overflow-hidden relative bg-gray-100 block group/item">
                                <img src="${cat.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" alt="${cat.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105">
                                <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent"></div>
                                <span class="absolute left-3 bottom-2 text-[10px] font-semibold uppercase tracking-wider text-white">
                                    ${count} bài viết
                                </span>
                            </a>
                            <h5 class="font-bold text-primary uppercase text-xs tracking-wider">
                                <a href="tin-tuc.html?category=${cat.id}" class="hover:text-leaf-accent transition-colors">${cat.title}</a>
                            </h5>
                            <ul class="space-y-1">
                                ${linksHtml}
                            </ul>
                        </div>
                    `;
                }).join('');

                grids.forEach(grid => {
                    grid.innerHTML = html;
                });
            })
            .catch(err => {
                console.error("Error loading news mega menu:", err);
            });
    }

    // Helper: Slugify Vietnamese text
    function slugify(text) {
        return text.toString().toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
            .replace(/\s+/g, '-') // collapse whitespace
            .replace(/-+/g, '-'); // collapse dashes
    }

    // Helper: Format Date to Vietnamese text
    function getFormattedDate() {
        const d = new Date();
        const months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
        return `${d.getDate()} tháng ${months[d.getMonth()]}, ${d.getFullYear()}`;
    }

    // News Manager Modal implementation
    function openNewsManagerModal(directEditSlug) {
        fetch('js/news.json?' + new Date().getTime())
            .then(res => res.json())
            .then(news => {
                let activeCatIdx = 0;
                let directEditCatIdx = -1;
                let directEditArtIdx = -1;

                if (typeof directEditSlug === 'string') {
                    news.forEach((cat, cIdx) => {
                        cat.articles.forEach((art, aIdx) => {
                            if (art.id === directEditSlug) {
                                directEditCatIdx = cIdx;
                                directEditArtIdx = aIdx;
                            }
                        });
                    });
                }

                const modal = createModalContainer();
                
                function renderMainView() {
                    modal.innerHTML = `
                        <div class="admin-modal-content" style="max-width: 850px; width: 95vw;">
                            <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 18px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">Quản Lý Tin Tức & Bài Viết</h3>
                            
                            <div style="display: grid; grid-template-columns: 240px 1fr; gap: 20px; max-height: 60vh; min-height: 40vh;">
                                <!-- Left Column: Categories -->
                                <div style="border-right: 1px solid #E5E7EB; padding-right: 16px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <h4 style="font-weight:700; font-size:14px; color:#374151; margin-bottom:12px;">Chuyên mục</h4>
                                        <div id="modal-cat-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; max-height:45vh;">
                                            <!-- Render Categories list -->
                                        </div>
                                    </div>
                                    <button type="button" id="modal-add-cat-btn" style="background:#82C341; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; gap:4px; margin-top:12px;">
                                        <span class="material-symbols-outlined" style="font-size: 16px;">add_circle</span> Thêm chuyên mục
                                    </button>
                                </div>
                                
                                <!-- Right Column: Articles -->
                                <div style="display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                            <h4 style="font-weight:700; font-size:14px; color:#374151;">Bài viết trong chuyên mục</h4>
                                            <button type="button" id="modal-add-article-btn" style="background:#005696; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">add</span> Thêm bài viết mới
                                            </button>
                                        </div>
                                        <div id="modal-article-list" style="display:flex; flex-direction:column; gap:8px; overflow-y:auto; max-height:45vh; padding-right:4px;">
                                            <!-- Render Articles list -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Bottom controls -->
                            <div style="display: flex; justify-content: flex-end; border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 16px; gap:8px;">
                                <button type="button" id="modal-cancel-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Hủy</button>
                                <button type="button" id="modal-save-btn" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Lưu tin tức</button>
                            </div>
                        </div>
                    `;

                    // Bind Left Column
                    const catList = modal.querySelector('#modal-cat-list');
                    catList.innerHTML = news.map((cat, idx) => `
                        <div class="modal-cat-item" data-idx="${idx}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:6px; background:${idx === activeCatIdx ? '#e9edff' : 'transparent'}; cursor:pointer; border: 1px solid ${idx === activeCatIdx ? '#005696' : 'transparent'};">
                            <span style="font-weight:${idx === activeCatIdx ? '700' : '500'}; font-size:13px; color:${idx === activeCatIdx ? '#005696' : '#4b5563'}; truncate; max-width:140px;">
                                ${cat.title} (${cat.articles.length})
                            </span>
                            <div style="display:flex; gap:2px;">
                                <button type="button" class="cat-edit-btn" style="background:transparent; border:none; cursor:pointer; color:#4B5563; padding:2px; display:flex;" title="Sửa tên/ảnh đại diện">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                </button>
                                <button type="button" class="cat-delete-btn" style="background:transparent; border:none; cursor:pointer; color:#EF4444; padding:2px; display:flex;" title="Xóa chuyên mục">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                </button>
                            </div>
                        </div>
                    `).join('');

                    // Bind Left Column Item click & buttons
                    catList.querySelectorAll('.modal-cat-item').forEach(item => {
                        const idx = parseInt(item.getAttribute('data-idx'));
                        item.addEventListener('click', (e) => {
                            if (e.target.closest('button')) return;
                            activeCatIdx = idx;
                            renderMainView();
                        });

                        item.querySelector('.cat-edit-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            renderEditCategoryView(idx);
                        });

                        item.querySelector('.cat-delete-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (confirm(`Bạn chắc chắn muốn xóa chuyên mục "${news[idx].title}"? Toàn bộ bài viết bên trong cũng sẽ bị xóa.`)) {
                                news.splice(idx, 1);
                                if (activeCatIdx >= news.length && news.length > 0) {
                                    activeCatIdx = news.length - 1;
                                }
                                renderMainView();
                            }
                        });
                    });

                    // Add Category Button
                    modal.querySelector('#modal-add-cat-btn').addEventListener('click', () => {
                        renderEditCategoryView(-1);
                    });

                    // Bind Right Column (Articles)
                    const articleList = modal.querySelector('#modal-article-list');
                    const activeCat = news[activeCatIdx];
                    
                    if (!activeCat || !activeCat.articles || activeCat.articles.length === 0) {
                        articleList.innerHTML = `<p style="text-align:center; color:#6B7280; padding:32px; font-size:13px;">Chưa có bài viết nào trong chuyên mục này.</p>`;
                    } else {
                        articleList.innerHTML = activeCat.articles.map((art, idx) => `
                            <div class="modal-art-row" data-idx="${idx}" style="display:flex; align-items:center; gap:12px; border:1px solid #E5E7EB; padding:8px 12px; border-radius:8px; background:#F9FAFB;">
                                <img src="${art.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 50px; height: 35px; object-fit: cover; border: 1px solid #D1D5DB; border-radius:4px; background:white;">
                                <div style="flex:1; overflow:hidden;">
                                    <div style="font-weight:600; font-size:13px; color:#1F2937; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${art.title}">
                                        ${art.title}
                                    </div>
                                    <div style="font-size:11px; color:#6B7280; margin-top:2px;">
                                        Ngày đăng: ${art.date} | Tác giả: ${art.author}
                                    </div>
                                </div>
                                <div style="display:flex; gap:2px; align-items:center;">
                                    <button type="button" class="art-move-up" style="background:transparent; border:none; cursor:pointer; color:#4B5563; padding:2px; display:flex;" title="Di chuyển lên" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>
                                        <span class="material-symbols-outlined" style="font-size:18px;">arrow_upward</span>
                                    </button>
                                    <button type="button" class="art-move-down" style="background:transparent; border:none; cursor:pointer; color:#4B5563; padding:2px; display:flex;" title="Di chuyển xuống" ${idx === activeCat.articles.length - 1 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>
                                        <span class="material-symbols-outlined" style="font-size:18px;">arrow_downward</span>
                                    </button>
                                    <button type="button" class="art-edit-btn" style="background:transparent; border:none; cursor:pointer; color:#005696; padding:2px; display:flex;" title="Sửa bài viết">
                                        <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                                    </button>
                                    <button type="button" class="art-delete-btn" style="background:transparent; border:none; cursor:pointer; color:#EF4444; padding:2px; display:flex;" title="Xóa bài viết">
                                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                                    </button>
                                </div>
                            </div>
                        `).join('');

                        // Bind article action events
                        articleList.querySelectorAll('.modal-art-row').forEach(row => {
                            const idx = parseInt(row.getAttribute('data-idx'));
                            
                            row.querySelector('.art-move-up').addEventListener('click', () => {
                                if (idx > 0) {
                                    const temp = activeCat.articles[idx];
                                    activeCat.articles[idx] = activeCat.articles[idx - 1];
                                    activeCat.articles[idx - 1] = temp;
                                    renderMainView();
                                }
                            });

                            row.querySelector('.art-move-down').addEventListener('click', () => {
                                if (idx < activeCat.articles.length - 1) {
                                    const temp = activeCat.articles[idx];
                                    activeCat.articles[idx] = activeCat.articles[idx + 1];
                                    activeCat.articles[idx + 1] = temp;
                                    renderMainView();
                                }
                            });

                            row.querySelector('.art-edit-btn').addEventListener('click', () => {
                                renderEditArticleView(activeCatIdx, idx);
                            });

                            row.querySelector('.art-delete-btn').addEventListener('click', () => {
                                if (confirm(`Bạn chắc chắn muốn xóa bài viết "${activeCat.articles[idx].title}"?`)) {
                                    activeCat.articles.splice(idx, 1);
                                    renderMainView();
                                }
                            });
                        });
                    }

                    // Add Article button click
                    modal.querySelector('#modal-add-article-btn').addEventListener('click', () => {
                        renderEditArticleView(activeCatIdx, -1);
                    });

                    // General Cancel & Save bindings
                    modal.querySelector('#modal-cancel-btn').addEventListener('click', () => {
                        modal.remove();
                    });

                    modal.querySelector('#modal-save-btn').addEventListener('click', () => {
                        const saveBtn = modal.querySelector('#modal-save-btn');
                        saveBtn.disabled = true;
                        saveBtn.innerText = "Đang lưu...";

                        fetch('/api/save-json', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                file: 'js/news.json',
                                data: news
                            })
                        })
                        .then(res => res.json())
                        .then(resData => {
                            if (resData.status === 'success') {
                                showToast("Đã lưu chuyên mục tin tức thành công!");
                                loadNewsMegaMenu();
                                modal.remove();
                                if (window.location.pathname.includes('tin-tuc.html') || window.location.pathname.includes('chi-tiet-tin-tuc.html')) {
                                    window.location.reload();
                                }
                            } else {
                                alert("Lỗi ghi file tin tức: " + resData.message);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            alert("Lỗi kết nối máy chủ local!");
                        })
                        .finally(() => {
                            saveBtn.disabled = false;
                            saveBtn.innerText = "Lưu tin tức";
                        });
                    });
                }

                // Helper views inside Modal
                function renderEditCategoryView(catIdx) {
                    const isNew = catIdx === -1;
                    const cat = isNew ? { id: '', title: '', image_url: '' } : news[catIdx];

                    modal.innerHTML = `
                        <div class="admin-modal-content" style="max-width: 500px; width: 90vw;">
                            <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 17px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
                                ${isNew ? 'Thêm Chuyên Mục Tin Mới' : 'Sửa Chuyên Mục Tin'}
                            </h3>
                            
                            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Tên chuyên mục *</label>
                                    <input type="text" id="cat-title-input" value="${cat.title}" placeholder="Ví dụ: Tin Sản Phẩm" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;">
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Đường dẫn (ID) *</label>
                                    <input type="text" id="cat-id-input" value="${cat.id}" placeholder="Ví dụ: tin-san-pham" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;" ${!isNew ? 'readonly style="background:#F3F4F6;"' : ''}>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Ảnh đại diện chuyên mục *</label>
                                    <div style="display:flex; gap:12px; align-items:center;">
                                        <img id="cat-img-preview" src="${cat.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 100px; height: 60px; object-fit: cover; border: 1px solid #D1D5DB; border-radius:6px; background:white;">
                                        <div>
                                            <button type="button" id="cat-upload-btn" style="background:#E5E7EB; color:#374151; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Tải ảnh từ máy</button>
                                            <input type="hidden" id="cat-img-url" value="${cat.image_url}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #E5E7EB; padding-top:16px;">
                                <button type="button" id="cat-back-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Quay lại</button>
                                <button type="button" id="cat-save-btn" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Đồng ý</button>
                            </div>
                        </div>
                    `;

                    // Bind image uploader
                    modal.querySelector('#cat-upload-btn').addEventListener('click', () => {
                        chooseAndUploadImage(url => {
                            modal.querySelector('#cat-img-preview').src = url;
                            modal.querySelector('#cat-img-url').value = url;
                        });
                    });

                    // Auto slugify category ID on title input
                    if (isNew) {
                        const titleInput = modal.querySelector('#cat-title-input');
                        const idInput = modal.querySelector('#cat-id-input');
                        titleInput.addEventListener('input', () => {
                            idInput.value = slugify(titleInput.value);
                        });
                    }

                    // Back
                    modal.querySelector('#cat-back-btn').addEventListener('click', renderMainView);

                    // Save category in local memory
                    modal.querySelector('#cat-save-btn').addEventListener('click', () => {
                        const title = modal.querySelector('#cat-title-input').value.trim();
                        const id = modal.querySelector('#cat-id-input').value.trim();
                        const imgUrl = modal.querySelector('#cat-img-url').value;

                        if (!title || !id) {
                            alert("Vui lòng điền đầy đủ tên và đường dẫn!");
                            return;
                        }

                        if (isNew) {
                            if (news.some(c => c.id === id)) {
                                alert("Đường dẫn này đã tồn tại! Vui lòng chọn đường dẫn khác.");
                                return;
                            }
                            news.push({
                                id,
                                title,
                                image_url: imgUrl,
                                articles: []
                            });
                            activeCatIdx = news.length - 1;
                        } else {
                            cat.title = title;
                            cat.image_url = imgUrl;
                        }

                        renderMainView();
                    });
                }

                function renderEditArticleView(catIdx, artIdx) {
                    const isNew = artIdx === -1;
                    const cat = news[catIdx];
                    const art = isNew ? {
                        id: '',
                        title: '',
                        date: getFormattedDate(),
                        author: 'Ocean Wood',
                        image_url: '',
                        excerpt: '',
                        content: '',
                        tags: []
                    } : cat.articles[artIdx];

                    modal.innerHTML = `
                        <div class="admin-modal-content" style="max-width: 780px; width: 95vw; max-height: 90vh; overflow-y: auto;">
                            <h3 class="text-xl font-bold text-primary mb-4" style="font-size: 17px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
                                ${isNew ? 'Thêm Bài Viết Mới' : 'Sửa Bài Viết'}
                            </h3>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Tiêu đề bài viết *</label>
                                    <input type="text" id="art-title-input" value="${art.title}" placeholder="Ví dụ: Ván ép chịu nước tốt" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;">
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Đường dẫn (Slug ID) *</label>
                                    <input type="text" id="art-id-input" value="${art.id}" placeholder="Ví dụ: van-ep-chiu-nuoc-tot" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;" ${!isNew ? 'readonly style="background:#F3F4F6;"' : ''}>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Tác giả</label>
                                    <input type="text" id="art-author-input" value="${art.author}" placeholder="Mặc định: Ocean Wood" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;">
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">
                                    <label style="font-weight:600; font-size:12px; color:#4B5563;">Ngày đăng</label>
                                    <input type="text" id="art-date-input" value="${art.date}" placeholder="Định dạng: 24 tháng 6, 2026" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;">
                                </div>
                            </div>
                            
                            <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
                                <label style="font-weight:600; font-size:12px; color:#4B5563;">Ảnh đại diện bài viết (Thumbnail) *</label>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <img id="art-img-preview" src="${art.image_url || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}" style="width: 100px; height: 60px; object-fit: cover; border: 1px solid #D1D5DB; border-radius:6px; background:white;">
                                    <div>
                                        <button type="button" id="art-upload-btn" style="background:#E5E7EB; color:#374151; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">Tải ảnh</button>
                                        <input type="hidden" id="art-img-url" value="${art.image_url}">
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
                                <label style="font-weight:600; font-size:12px; color:#4B5563;">Tóm tắt ngắn (Excerpt) *</label>
                                <textarea id="art-excerpt-input" rows="2" placeholder="Tóm tắt hiển thị trên danh sách bài viết..." style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none; resize:vertical; font-family:inherit;">${art.excerpt}</textarea>
                            </div>
                            
                            <div id="wysiwyg-editor-wrapper" style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
                                <label style="font-weight:600; font-size:12px; color:#4B5563; display:flex; justify-content:space-between; align-items:center;">
                                    <span>Nội dung bài viết *</span>
                                    <div style="display:flex; gap:4px; align-items:center;" class="formatting-toolbar">
                                        <button type="button" id="wysiwyg-b" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 8px; font-weight:700; cursor:pointer; font-size:12px;" title="Chữ Đậm">B</button>
                                        <button type="button" id="wysiwyg-i" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 8px; font-style:italic; cursor:pointer; font-size:12px;" title="Chữ Nghiêng">I</button>
                                        <button type="button" id="wysiwyg-h2" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;" title="Tiêu đề H2">H2</button>
                                        <button type="button" id="wysiwyg-h3" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;" title="Tiêu đề H3">H3</button>
                                        <button type="button" id="wysiwyg-list" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Danh sách đầu dòng"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">format_list_bulleted</span></button>
                                        <button type="button" id="wysiwyg-img" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Chèn Ảnh"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">image</span></button>
                                        <button type="button" id="wysiwyg-clear" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Xóa định dạng"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">format_clear</span></button>
                                        <button type="button" id="wysiwyg-fullscreen" class="format-btn" style="background:#f3f4f6; border:1px solid #d1d5db; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Phóng to"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">fullscreen</span></button>
                                        <button type="button" id="wysiwyg-mode-toggle" class="format-btn" style="background:#e9edff; border:1px solid #005696; color:#005696; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:700; cursor:pointer;" title="Chuyển sang chế độ Mã HTML">Xem mã HTML</button>
                                    </div>
                                </label>
                                <div id="art-wysiwyg-editor" class="rich-content" contenteditable="true" style="border:1px solid #c1c7d2; padding:12px; border-radius:6px; font-size:15px; outline:none; min-height:250px; max-height:350px; overflow-y:auto; background:white; line-height:1.6; margin-top:4px;">
                                    ${art.content || '<p><br></p>'}
                                </div>
                                <textarea id="art-html-editor" rows="10" placeholder="Soạn thảo nội dung bài viết bằng mã HTML..." style="display:none; border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none; resize:vertical; font-family:monospace; line-height:1.4; margin-top:4px; width:100%;"></textarea>
                            </div>
                            
                            <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
                                <label style="font-weight:600; font-size:12px; color:#4B5563;">Từ khóa (Tags) - Phân cách bằng dấu phẩy</label>
                                <input type="text" id="art-tags-input" value="${(art.tags || []).join(', ')}" placeholder="Ví dụ: Plywood, Tủ bếp, Meranti" style="border:1px solid #c1c7d2; padding:8px; border-radius:6px; font-size:13px; outline:none;">
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #E5E7EB; padding-top:16px; margin-top:16px;">
                                <button type="button" id="art-back-btn" style="background:transparent; color:#6B7280; border:1px solid #D1D5DB; padding:8px 16px; border-radius:6px; cursor:pointer;">Quay lại</button>
                                <button type="button" id="art-save-btn" style="background:#005696; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Đồng ý</button>
                            </div>
                        </div>
                    `;

                    // DOM elements in view
                    const titleInput = modal.querySelector('#art-title-input');
                    const idInput = modal.querySelector('#art-id-input');
                    const excerptInput = modal.querySelector('#art-excerpt-input');
                    const wysiwygEditor = modal.querySelector('#art-wysiwyg-editor');
                    const htmlEditor = modal.querySelector('#art-html-editor');
                    const tagsInput = modal.querySelector('#art-tags-input');
                    const authorInput = modal.querySelector('#art-author-input');
                    const dateInput = modal.querySelector('#art-date-input');
                    const imgUrlInput = modal.querySelector('#art-img-url');

                    // Bind image uploader
                    modal.querySelector('#art-upload-btn').addEventListener('click', () => {
                        chooseAndUploadImage(url => {
                            modal.querySelector('#art-img-preview').src = url;
                            imgUrlInput.value = url;
                        });
                    });

                    // Auto slugify article ID on title input
                    if (isNew) {
                        titleInput.addEventListener('input', () => {
                            idInput.value = slugify(titleInput.value);
                        });
                    }

                    let isHtmlMode = false;
                    const modeToggleBtn = modal.querySelector('#wysiwyg-mode-toggle');

                    // Toggle HTML/Visual editor modes
                    modeToggleBtn.addEventListener('click', () => {
                        if (!isHtmlMode) {
                            htmlEditor.value = wysiwygEditor.innerHTML;
                            wysiwygEditor.style.display = 'none';
                            htmlEditor.style.display = 'block';
                            modeToggleBtn.innerText = "Xem trực quan";
                            modeToggleBtn.style.background = "#fffbeb";
                            modeToggleBtn.style.color = "#d97706";
                            modeToggleBtn.style.borderColor = "#d97706";
                            modal.querySelectorAll('.formatting-toolbar button:not(#wysiwyg-mode-toggle)').forEach(btn => btn.style.opacity = '0.3');
                        } else {
                            wysiwygEditor.innerHTML = htmlEditor.value;
                            htmlEditor.style.display = 'none';
                            wysiwygEditor.style.display = 'block';
                            modeToggleBtn.innerText = "Xem mã HTML";
                            modeToggleBtn.style.background = "#e9edff";
                            modeToggleBtn.style.color = "#005696";
                            modeToggleBtn.style.borderColor = "#005696";
                            modal.querySelectorAll('.formatting-toolbar button:not(#wysiwyg-mode-toggle)').forEach(btn => btn.style.opacity = '1');
                        }
                        isHtmlMode = !isHtmlMode;
                    });

                    // Save Selection range helper for image upload selection restore
                    let savedRange = null;
                    function saveSelection() {
                        const sel = window.getSelection();
                        if (sel.getRangeAt && sel.rangeCount) {
                            savedRange = sel.getRangeAt(0);
                        }
                    }
                    function restoreSelection() {
                        if (savedRange) {
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        }
                    }

                    // Rich Text Command Handlers
                    modal.querySelector('#wysiwyg-b').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('bold', false, null);
                    });
                    modal.querySelector('#wysiwyg-i').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('italic', false, null);
                    });
                    modal.querySelector('#wysiwyg-h2').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('formatBlock', false, '<h2>');
                    });
                    modal.querySelector('#wysiwyg-h3').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('formatBlock', false, '<h3>');
                    });
                    modal.querySelector('#wysiwyg-list').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('insertUnorderedList', false, null);
                    });
                    modal.querySelector('#wysiwyg-clear').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        document.execCommand('removeFormat', false, null);
                    });
                    modal.querySelector('#wysiwyg-img').addEventListener('click', (e) => {
                        e.preventDefault();
                        if (isHtmlMode) return;
                        wysiwygEditor.focus();
                        saveSelection();
                        chooseAndUploadImage(url => {
                            restoreSelection();
                            wysiwygEditor.focus();
                            document.execCommand('insertImage', false, url);
                        });
                    });

                    // Fullscreen toggle logic
                    const wrapper = modal.querySelector('#wysiwyg-editor-wrapper');
                    const fullscreenBtn = modal.querySelector('#wysiwyg-fullscreen');
                    const fsIcon = fullscreenBtn.querySelector('.material-symbols-outlined');
                    let isFullscreen = false;

                    fullscreenBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        isFullscreen = !isFullscreen;
                        if (isFullscreen) {
                            wrapper.style.position = 'fixed';
                            wrapper.style.top = '0';
                            wrapper.style.left = '0';
                            wrapper.style.width = '100vw';
                            wrapper.style.height = '100vh';
                            wrapper.style.background = '#f9f9ff';
                            wrapper.style.zIndex = '9999';
                            wrapper.style.padding = '24px';
                            wrapper.style.margin = '0';
                            
                            wysiwygEditor.style.maxHeight = 'calc(100vh - 140px)';
                            wysiwygEditor.style.height = 'calc(100vh - 140px)';
                            htmlEditor.style.height = 'calc(100vh - 140px)';
                            
                            fsIcon.textContent = 'fullscreen_exit';
                            fullscreenBtn.title = "Thu nhỏ";
                            fullscreenBtn.style.background = "#e9edff";
                            fullscreenBtn.style.color = "#005696";
                            fullscreenBtn.style.borderColor = "#005696";
                        } else {
                            wrapper.style.position = '';
                            wrapper.style.top = '';
                            wrapper.style.left = '';
                            wrapper.style.width = '';
                            wrapper.style.height = '';
                            wrapper.style.background = '';
                            wrapper.style.zIndex = '';
                            wrapper.style.padding = '';
                            wrapper.style.margin = '';
                            
                            wysiwygEditor.style.maxHeight = '350px';
                            wysiwygEditor.style.height = '';
                            htmlEditor.style.height = '';
                            
                            fsIcon.textContent = 'fullscreen';
                            fullscreenBtn.title = "Phóng to";
                            fullscreenBtn.style.background = "#f3f4f6";
                            fullscreenBtn.style.color = "";
                            fullscreenBtn.style.borderColor = "#d1d5db";
                        }
                    });

                    // Back
                    modal.querySelector('#art-back-btn').addEventListener('click', renderMainView);

                    // Save local
                    modal.querySelector('#art-save-btn').addEventListener('click', () => {
                        const title = titleInput.value.trim();
                        const id = idInput.value.trim();
                        const excerpt = excerptInput.value.trim();
                        const content = isHtmlMode ? htmlEditor.value.trim() : wysiwygEditor.innerHTML.trim();
                        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
                        const date = dateInput.value.trim();
                        const author = authorInput.value.trim();
                        const imgUrl = imgUrlInput.value;

                        if (!title || !id || !excerpt || !content || !imgUrl) {
                            alert("Vui lòng nhập đầy đủ các trường đánh dấu dấu sao (*)");
                            return;
                        }

                        const artObj = { id, title, date, author, image_url: imgUrl, excerpt, content, tags };

                        if (isNew) {
                            let isDuplicate = false;
                            news.forEach(c => {
                                if (c.articles.some(a => a.id === id)) {
                                    isDuplicate = true;
                                }
                            });
                            if (isDuplicate) {
                                alert("Đường dẫn (Slug ID) này đã tồn tại! Vui lòng đặt đường dẫn khác.");
                                return;
                            }
                            cat.articles.push(artObj);
                        } else {
                            cat.articles[artIdx] = artObj;
                        }

                        renderMainView();
                    });
                }

                // Initial render call: check if we should jump straight to editing a specific article
                if (directEditCatIdx !== -1 && directEditArtIdx !== -1) {
                    activeCatIdx = directEditCatIdx;
                    renderEditArticleView(directEditCatIdx, directEditArtIdx);
                } else {
                    renderMainView();
                }
            })
            .catch(err => {
                console.error("Lỗi nạp tin tức quản trị:", err);
                alert("Lỗi tải cơ sở dữ liệu tin tức!");
            });
    }

    // Export inline edit helper globally
    window.editArticleInline = function(slugId) {
        openNewsManagerModal(slugId);
    };
})();
