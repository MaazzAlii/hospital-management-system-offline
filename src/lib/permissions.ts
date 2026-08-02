/**
 * Checks if a role has access to a specific module or action.
 * Modules: 'dashboard', 'patients', 'doctors', 'appointments', 'opd', 'pharmacy', 'lab', 'billing', 'settings'
 * Actions: 'read', 'write', 'delete', 'apply_discount', 'verify_lab'
 */
export function hasAccess(role: string | null, module: string, action: string = 'read'): boolean {
  if (!role) return false;
  
  // Normalize role string to handle different cases and spacing (e.g., 'Super Admin', 'super_admin', 'superadmin')
  const normalizedRole = role.toLowerCase().replace(/_/g, ' ').trim();

  // Admin / Super Admin bypass: full access to everything unconditionally
  if (normalizedRole === 'admin' || normalizedRole === 'super admin' || normalizedRole === 'superadmin') return true;

  if (normalizedRole === 'hospital admin' || role === 'Hospital Admin') {
    if (module === 'audit' && action === 'delete') return false;
    return true;
  }

  if (normalizedRole === 'receptionist') {
    if (action === 'delete') return false;
    if (action === 'apply_discount') return false;
    
    if (module === 'patients' || module === 'appointments') return true; // full access (except delete)
    if (module === 'dashboard') return true;
    
    // Read-only on Doctors/Billing
    if (module === 'doctors' || module === 'billing') {
      return action === 'read';
    }
    
    // NO access to Pharmacy, Lab, Settings
    return false;
  }

  if (normalizedRole === 'doctor') {
    if (module === 'dashboard') return true;
    
    // Access to appointments/opd/lab orders (row-level 'own data' restriction enforced in action handlers)
    if (module === 'appointments' || module === 'opd' || module === 'lab') {
      return true; // We allow access to module, but restrict to 'own' at data level
    }

    if (module === 'patients') return true;

    // NO access to Billing, Pharmacy, Settings
    return false;
  }

  if (normalizedRole === 'lab technician' || normalizedRole === 'labtechnician') {
    if (module === 'dashboard') return true;
    if (action === 'verify_lab') return false;
    if (action === 'delete') return false;

    if (module === 'lab') return true;
    
    return false;
  }

  if (normalizedRole === 'pathologist') {
    if (module === 'dashboard') return true;
    if (module === 'lab') return true;
    
    // NO access to Billing, Pharmacy, Patients
    return false;
  }

  if (normalizedRole === 'pharmacist') {
    if (module === 'dashboard') return true;
    if (module === 'pharmacy') return true;

    // NO access to Patients, Doctors, Appointments, Lab
    return false;
  }

  if (normalizedRole === 'cashier') {
    if (module === 'dashboard') return true;
    if (action === 'delete') return false;

    if (module === 'billing') return true;
    
    // Read-only for patients for billing
    if (module === 'patients' && action === 'read') return true;

    // NO access to Pharmacy, Lab
    return false;
  }

  return false;
}
