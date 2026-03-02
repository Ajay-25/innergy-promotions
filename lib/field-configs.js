// ============================================================
// People & Attendance App - Field Configurations
// Maps data columns to database fields
// ============================================================

export const PERSONAL_FIELDS = [
  { key: 'member_id', label: 'Member ID', type: 'text', source: 'core' },
  { key: 'first_name', label: 'First Name', type: 'text', source: 'core' },
  { key: 'middle_name', label: 'Middle Name', type: 'text', source: 'core' },
  { key: 'last_name', label: 'Last Name', type: 'text', source: 'core' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], source: 'data' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'text', source: 'data' },
  { key: 'age', label: 'Age', type: 'text', source: 'data' },
  { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], source: 'data' },
  { key: 'blood_group', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], source: 'data' },
  { key: 'willing_blood_donation', label: 'Willing for Blood Donation', type: 'select', options: ['Yes', 'No'], source: 'data' },
  { key: 'image_remarks', label: 'Image Remarks', type: 'text', source: 'data' },
  { key: 'image_saved_as', label: 'Image Saved As', type: 'text', source: 'data' },
]

export const CONTACT_FIELDS = [
  { key: 'contact_number', label: 'Contact Number (Mobile)', type: 'tel', source: 'data' },
  { key: 'alternate_contact', label: 'Alternate Contact Number', type: 'tel', source: 'data' },
  { key: 'whatsapp_number', label: 'WhatsApp #', type: 'tel', source: 'data' },
  { key: 'emergency_contact', label: 'Emergency Contact #', type: 'tel', source: 'data' },
  { key: 'emergency_relationship', label: 'Relationship (Emergency Contact)', type: 'text', source: 'data' },
  { key: 'preferred_communication', label: 'Preferred Medium of Communication', type: 'select', options: ['WhatsApp', 'SMS', 'Email', 'Phone Call'], source: 'data' },
  { key: 'languages_known', label: 'Languages Known (Other than English/Hindi)', type: 'text', source: 'data' },
  { key: 'email_id', label: 'Email ID', type: 'email', source: 'data' },
]

export const ADDRESS_FIELDS = [
  // Permanent Address
  { key: 'permanent_address', label: 'Permanent Address', type: 'textarea', source: 'data', section: 'Permanent Address' },
  { key: 'landmark', label: 'Landmark', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'country', label: 'Country', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'state', label: 'State', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'district', label: 'District', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'tehsil', label: 'Tehsil', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'city_town_village', label: 'City/Town/Village', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'post_office', label: 'Post Office', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'pin_code', label: 'Pin Code', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'permanent_center', label: 'Permanent Center', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'zone_permanent_center', label: 'Zone (Permanent Center)', type: 'text', source: 'data', section: 'Permanent Address' },
  { key: 'permanent_address_remarks', label: 'Address Remarks', type: 'text', source: 'data', section: 'Permanent Address' },
  // Communication Address
  { key: 'same_as_permanent', label: 'Same as Permanent Address?', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Communication Address' },
  { key: 'communication_address', label: 'Communication Address', type: 'textarea', source: 'data', section: 'Communication Address' },
  { key: 'communication_pincode', label: 'Pincode', type: 'text', source: 'data', section: 'Communication Address' },
  { key: 'communication_remarks', label: 'Remarks', type: 'text', source: 'data', section: 'Communication Address' },
]

export const DEPARTMENT_FIELDS = [
  { key: 'department', label: 'Department', type: 'text', source: 'data', section: 'Department & Region' },
  { key: 'region', label: 'Region', type: 'text', source: 'data', section: 'Department & Region' },
  { key: 'if_initiated', label: 'If Initiated', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Initiation' },
  { key: 'initiated_by', label: 'Initiated By', type: 'text', source: 'data', section: 'Initiation' },
  { key: 'date_of_initiation', label: 'Date of Initiation', type: 'text', source: 'data', section: 'Initiation' },
  { key: 'initiation_remarks', label: 'Initiation Remarks', type: 'text', source: 'data', section: 'Initiation' },
  { key: 'primary_duty_permanent', label: 'Primary Duty Area (Permanent)', type: 'text', source: 'data', section: 'Duty Areas - Permanent' },
  { key: 'secondary_duty_permanent', label: 'Secondary Duty Area (Permanent)', type: 'text', source: 'data', section: 'Duty Areas - Permanent' },
  { key: 'other_duty_permanent', label: 'Other Duty Area (Permanent)', type: 'text', source: 'data', section: 'Duty Areas - Permanent' },
  { key: 'primary_duty_current', label: 'Primary Duty Area (Current)', type: 'text', source: 'data', section: 'Duty Areas - Current' },
  { key: 'secondary_duty_current', label: 'Secondary Duty Area (Current)', type: 'text', source: 'data', section: 'Duty Areas - Current' },
  { key: 'other_duty_current', label: 'Other Duty Area (Current)', type: 'text', source: 'data', section: 'Duty Areas - Current' },
  { key: 'duty_area_local', label: 'Local Duty Area', type: 'text', source: 'data', section: 'Duty Areas - Current' },
]

export const EDUCATION_FIELDS = [
  { key: 'highest_qualification', label: 'Highest Qualification', type: 'select', options: ['Below 10th', '10th', '12th', 'Graduate', 'Post Graduate', 'Doctorate', 'Other'], source: 'data', section: 'Qualification' },
  { key: 'graduation', label: 'Graduation', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'graduation_secondary', label: 'Graduation (Secondary/Not Listed)', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'graduation_college', label: 'College/School Name', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'post_graduation', label: 'Post Graduation', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'post_graduation_secondary', label: 'PG (Secondary/Not Listed)', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'post_graduation_college', label: 'PG College Name', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'professional_course', label: 'Professional Course', type: 'text', source: 'data', section: 'Qualification' },
  { key: 'occupation_category', label: 'Occupation Category', type: 'select', options: ['Student', 'Employed', 'Self-Employed', 'Business', 'Homemaker', 'Retired', 'Other'], source: 'data', section: 'Profession' },
  { key: 'profession', label: 'Profession', type: 'text', source: 'data', section: 'Profession' },
  { key: 'profession_business_name', label: 'Business Name / Others', type: 'text', source: 'data', section: 'Profession' },
  { key: 'company_name', label: 'Company / Business Domain', type: 'text', source: 'data', section: 'Profession' },
  { key: 'job_designation', label: 'Job Designation', type: 'text', source: 'data', section: 'Profession' },
  { key: 'special_skills', label: 'Special Skills', type: 'text', source: 'data', section: 'Profession' },
]

export const MEMBERSHIP_STATUS_FIELDS = [
  { key: 'permanent_icard_status', label: 'Permanent I-Card Status', type: 'text', source: 'data', section: 'I-Card & Uniform' },
  { key: 'type_of_icard', label: 'Type of I-Card', type: 'text', source: 'data', section: 'I-Card & Uniform' },
  { key: 'icard_remarks', label: 'ID Card Remarks', type: 'text', source: 'data', section: 'I-Card & Uniform' },
  { key: 'permanent_icard_request', label: 'Permanent ID Card Request', type: 'text', source: 'data', section: 'I-Card & Uniform' },
  { key: 'miscellaneous', label: 'Miscellaneous', type: 'text', source: 'data', section: 'I-Card & Uniform' },
  { key: 'uniform', label: 'Uniform (Yes/No)', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'I-Card & Uniform' },
  { key: 'orientation_training', label: 'Orientation/Training', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Orientation' },
  { key: 'place_of_orientation', label: 'Place of Orientation', type: 'text', source: 'data', section: 'Orientation' },
  { key: 'date_of_joining', label: 'Date of Joining / Orientation', type: 'text', source: 'data', section: 'Orientation' },
  { key: 'orientation_date_remarks', label: 'Orientation Date Remarks', type: 'text', source: 'data', section: 'Orientation' },
  { key: 'years_of_membership', label: 'Years of Membership', type: 'text', source: 'data', section: 'Orientation' },
  { key: 'active_status', label: 'Active Status', type: 'select', options: ['Active', 'Inactive', 'On Leave', 'Transferred'], source: 'data', section: 'Status' },
  { key: 'active_status_updated_on', label: 'Active Status Updated On', type: 'text', source: 'data', section: 'Status' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', source: 'data', section: 'Status' },
  { key: 'member_id_remarks', label: 'Member ID Remarks', type: 'text', source: 'data', section: 'Status' },
  { key: 'role_responsibility', label: 'Role/Responsibility', type: 'text', source: 'data', section: 'Status' },
  { key: 'role_updated_on', label: 'Role Updated On', type: 'text', source: 'data', section: 'Status' },
  { key: 'registered_beone', label: 'Registered on Be-One', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Digital & Apps' },
  { key: 'sos_username', label: 'SOS User Name', type: 'text', source: 'data', section: 'Digital & Apps' },
  { key: 'beone_remarks', label: 'Remarks (Be-One)', type: 'text', source: 'data', section: 'Digital & Apps' },
  { key: 'knows_car_driving', label: 'Knows Car Driving', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Digital & Apps' },
  { key: 'using_event_app', label: 'Using Event App', type: 'select', options: ['Yes', 'No'], source: 'data', section: 'Digital & Apps' },
  { key: 'sat_sandesh', label: 'Sat-Sandesh', type: 'text', source: 'data', section: 'Digital & Apps' },
  { key: 'social_media', label: 'Social Media', type: 'text', source: 'data', section: 'Digital & Apps' },
  { key: 'frontend_duty_preference', label: 'Frontend Duty Preference', type: 'text', source: 'data', section: 'Preferences' },
  { key: 'backend_duty_preference', label: 'Backend Duty Preference', type: 'text', source: 'data', section: 'Preferences' },
  { key: 'availability', label: 'Availability (Sunday/Weekdays)', type: 'text', source: 'data', section: 'Preferences' },
  { key: 'duty_timings', label: 'Duty Timings', type: 'text', source: 'data', section: 'Preferences' },
  { key: 'last_updated_sheet', label: 'Last Updated (Sheet)', type: 'text', source: 'data', section: 'Data Metadata' },
  { key: 'data_updation_remarks', label: 'Data Updation Remarks', type: 'text', source: 'data', section: 'Data Metadata' },
]

export const SENSITIVE_FIELDS = [
  { key: 'id_proof_type', label: 'ID Proof Type', type: 'select', options: ['Aadhaar Card', 'Drivers License', 'Passport', 'Voter ID', 'Other'], section: 'ID Proof' },
  { key: 'id_proof_remarks', label: 'ID Proof Remarks', type: 'text', section: 'ID Proof' },
  { key: 'id_proof_saved_as', label: 'ID Proof Saved As', type: 'text', section: 'ID Proof' },
  { key: 'background_check_status', label: 'Background Check Status', type: 'select', options: ['pending', 'in_progress', 'cleared', 'flagged', 'rejected'], section: 'Admin' },
  { key: 'admin_notes', label: 'Admin Notes', type: 'textarea', section: 'Admin' },
  { key: 'flag_status', label: 'Flag Status', type: 'select', options: ['none', 'watch', 'restricted', 'blocked'], section: 'Admin' },
]

// Tab configuration
export const PROFILE_TABS = [
  { id: 'personal', label: 'Personal', fields: PERSONAL_FIELDS },
  { id: 'contact', label: 'Contact', fields: CONTACT_FIELDS },
  { id: 'address', label: 'Address', fields: ADDRESS_FIELDS },
  { id: 'department', label: 'Department', fields: DEPARTMENT_FIELDS },
  { id: 'education', label: 'Edu & Work', fields: EDUCATION_FIELDS },
  { id: 'membership_status', label: 'Membership Status', fields: MEMBERSHIP_STATUS_FIELDS },
]

// Helper: Group fields by section
export function groupBySection(fields) {
  const groups = {}
  fields.forEach(f => {
    const section = f.section || 'General'
    if (!groups[section]) groups[section] = []
    groups[section].push(f)
  })
  return groups
}
