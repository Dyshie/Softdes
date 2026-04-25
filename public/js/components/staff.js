/**
 * Staff Component
 */
function canManageStaff() {
    const currentUser = getCurrentUser() || {};
    return currentUser.role === 'super_admin';
}

async function renderStaff() {
    const container = document.getElementById('app-container');
    const canManage = canManageStaff();
    
    container.innerHTML = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>Staff</h1>
                ${canManage ? '<button class="btn btn-primary" onclick="openStaffModal()">Add Staff Member</button>' : ''}
            </div>
            <div id="staff-container" class="card">
                <div class="card-body">Loading staff...</div>
            </div>
        </div>
    `;

    await loadStaff();
}

/**
 * Load and display staff
 */
async function loadStaff() {
    try {
        const staffMembers = await apiClient.staff.getAll();
        const container = document.getElementById('staff-container');
        const canManage = canManageStaff();

        if (!container) {
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-hover"><thead class="table-light"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        
        staffMembers.forEach(staff => {
            const statusBadge = staff.status === 'active' ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
            
            html += `<tr>
                <td>${staff.name}</td>
                <td>${staff.email}</td>
                <td>${staff.phone}</td>
                <td>${staff.role || staff.position || 'staff'}</td>
                <td>${statusBadge}</td>
                <td>
                    ${canManage ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="editStaff('${staff.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStaff('${staff.id}')">Delete</button>` : '<span class="text-muted">View only</span>'}
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading staff:', error);
        const container = document.getElementById('staff-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-danger">Error loading staff</div>';
        }
    }
}

/**
 * Open staff modal for creating/editing
 */
async function openStaffModal(staffId = null) {
    let modalHtml = `
        <div class="modal fade" id="staffModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="staff-modal-title">Add Staff Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="staff-form">
                            <div class="mb-3">
                                <label for="staff-name" class="form-label">Name</label>
                                <input type="text" class="form-control" id="staff-name" required>
                            </div>
                            <div class="mb-3">
                                <label for="staff-email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="staff-email" required>
                            </div>
                            <div class="mb-3">
                                <label for="staff-phone" class="form-label">Phone</label>
                                <input type="tel" class="form-control" id="staff-phone" required>
                            </div>
                            <div class="mb-3">
                                <label for="staff-role" class="form-label">Role</label>
                                <select class="form-control" id="staff-role" required>
                                    <option value="">Select a role</option>
                                    <option value="driver">Driver</option>
                                    <option value="staff">Staff</option>
                                    <option value="station_staff">Station Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="staff-status" class="form-label">Status</label>
                                <select class="form-control" id="staff-status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <input type="hidden" id="staff-id">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="saveStaff()">Save Staff</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('staffModal'));

    if (staffId) {
        try {
            const staff = await apiClient.staff.getOne(staffId);
            document.getElementById('staff-id').value = staffId;
            document.getElementById('staff-name').value = staff.name;
            document.getElementById('staff-email').value = staff.email;
            document.getElementById('staff-phone').value = staff.phone;
            document.getElementById('staff-role').value = staff.role || staff.position || '';
            document.getElementById('staff-status').value = staff.status;
            document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
        } catch (error) {
            console.error('Error loading staff:', error);
        }
    }

    modal.show();
    
    document.getElementById('staffModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Save staff member
 */
async function saveStaff() {
    try {
        const staffId = document.getElementById('staff-id').value;
        const data = {
            name: document.getElementById('staff-name').value,
            email: document.getElementById('staff-email').value,
            phone: document.getElementById('staff-phone').value,
            role: document.getElementById('staff-role').value,
            status: document.getElementById('staff-status').value
        };

        if (staffId) {
            await apiClient.staff.update(staffId, data);
        } else {
            await apiClient.staff.create(data);
        }

        bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide();
        await loadStaff();
    } catch (error) {
        alert('Error saving staff: ' + error.message);
    }
}

/**
 * Edit staff member
 */
async function editStaff(staffId) {
    await openStaffModal(staffId);
}

/**
 * Delete staff member
 */
async function deleteStaff(staffId) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
        await apiClient.staff.delete(staffId);
        await loadStaff();
    } catch (error) {
        alert('Error deleting staff: ' + error.message);
    }
}

// Register staff route
router.register('/staff', renderStaff);
