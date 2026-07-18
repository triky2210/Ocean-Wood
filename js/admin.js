/**
 * Ocean Wood - Visual CMS Editor
 * Handles inline text/image edits per section and JSON product/project database updates.
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
        bar.querySelector('.admin-btn-publish').addEventListener('click', publishToGithub);
        bar.querySelector('.admin-btn-exit').addEventListener('click', () => {
            window.location.search = '?admin=false';
        });
    }

    // Section-based inline editing logic
    function setupSectionBasedEditing() {
        // Query all major sections: header, footer, and main blocks
        const sections = document.querySelectorAll('main > section, main > div, header, footer');
        
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
            if (el.closest('.product-card') || el.closest('.project-card') || el.closest('.admin-bar') || el.closest('.admin-modal') || el.closest('#inquiry-modal')) {
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
            // Skip product/project cards, admin UI and small icons
            if (img.closest('.product-card') || img.closest('.project-card') || img.closest('.admin-bar') || img.closest('.admin-modal') || img.height <= 20) {
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

        // 2. Unwrap images
        section.querySelectorAll('.admin-image-container').forEach(wrapper => {
            const img = wrapper.querySelector('img');
            const parent = wrapper.parentNode;
            if (img && parent) {
                parent.insertBefore(img, wrapper);
                wrapper.remove();
            }
        });

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
        document.querySelectorAll('main > section, main > div, header, footer').forEach(section => {
            // Remove contenteditable
            section.querySelectorAll('[contenteditable="true"]').forEach(el => {
                el.removeAttribute('contenteditable');
            });
            // Unwrap images
            section.querySelectorAll('.admin-image-container').forEach(wrapper => {
                const img = wrapper.querySelector('img');
                const parent = wrapper.parentNode;
                if (img && parent) {
                    parent.insertBefore(img, wrapper);
                    wrapper.remove();
                }
            });
        });

        // 2. Temporarily remove admin elements
        const adminBar = document.querySelector('.admin-bar');
        const adminCss = document.getElementById('admin-css');
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
})();
