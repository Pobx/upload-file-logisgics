import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  th: {
    translation: {
      appName: 'ระบบจัดการเอกสารโลจิสติกส์',
      search: 'ค้นหาเอกสาร',
      searchPlaceholder: 'ระบุ Job Order, B/L, หรือ Invoice No...',
      recentDocuments: 'เอกสารล่าสุด',
      workQueue: 'งานที่ต้องทำ (เอกสารยังไม่ครบ)',
      importCSV: 'นำเข้าข้อมูล CSV',
      customers: 'รายชื่อลูกค้า',
      users: 'จัดการผู้ใช้',
      reports: 'รายงานและสถิติ',
      systemDegraded: 'ระบบกำลังทำงานในสภาวะจำกัด: การเชื่อมต่อขัดข้องชั่วคราว',
      serviceRetry: 'กำลังเชื่อมต่อใหม่...',
      login: 'เข้าสู่ระบบ',
      logout: 'ออกจากระบบ',
      roleAdmin: 'ผู้ดูแลระบบ (Admin)',
      roleStaff: 'เจ้าหน้าที่ (Staff)',
      roleViewer: 'ผู้ตรวจสอบ (Viewer)',
    },
  },
  en: {
    translation: {
      appName: 'Logistics Document Hub',
      search: 'Search Documents',
      searchPlaceholder: 'Enter Job Order, B/L, or Invoice No...',
      recentDocuments: 'Recent Documents',
      workQueue: 'Work Queue (Missing Documents)',
      importCSV: 'Import CSV',
      customers: 'Customers',
      users: 'Users',
      reports: 'Reports',
      systemDegraded: 'System is running in degraded mode: connection issue',
      serviceRetry: 'Retrying connection...',
      login: 'Sign In',
      logout: 'Sign Out',
      roleAdmin: 'Administrator',
      roleStaff: 'Staff Member',
      roleViewer: 'Viewer',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'th',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
