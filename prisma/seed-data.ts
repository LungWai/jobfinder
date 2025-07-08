// Example seed data for the enhanced schema
// This file demonstrates how to populate reference tables

export const seedData = {
  // Location hierarchy for Hong Kong
  locations: {
    country: {
      name: 'Hong Kong',
      nameZh: '香港',
      type: 'COUNTRY',
    },
    regions: [
      { name: 'Hong Kong Island', nameZh: '香港島', type: 'REGION' },
      { name: 'Kowloon', nameZh: '九龍', type: 'REGION' },
      { name: 'New Territories', nameZh: '新界', type: 'REGION' },
      { name: 'Outlying Islands', nameZh: '離島', type: 'REGION' },
    ],
    districts: {
      'Hong Kong Island': [
        { name: 'Central', nameZh: '中環', type: 'DISTRICT' },
        { name: 'Wan Chai', nameZh: '灣仔', type: 'DISTRICT' },
        { name: 'Causeway Bay', nameZh: '銅鑼灣', type: 'DISTRICT' },
        { name: 'North Point', nameZh: '北角', type: 'DISTRICT' },
        { name: 'Quarry Bay', nameZh: '鰂魚涌', type: 'DISTRICT' },
        { name: 'Chai Wan', nameZh: '柴灣', type: 'DISTRICT' },
        { name: 'Aberdeen', nameZh: '香港仔', type: 'DISTRICT' },
      ],
      'Kowloon': [
        { name: 'Tsim Sha Tsui', nameZh: '尖沙咀', type: 'DISTRICT' },
        { name: 'Mong Kok', nameZh: '旺角', type: 'DISTRICT' },
        { name: 'Yau Ma Tei', nameZh: '油麻地', type: 'DISTRICT' },
        { name: 'Kowloon City', nameZh: '九龍城', type: 'DISTRICT' },
        { name: 'Kwun Tong', nameZh: '觀塘', type: 'DISTRICT' },
        { name: 'Wong Tai Sin', nameZh: '黃大仙', type: 'DISTRICT' },
        { name: 'Sham Shui Po', nameZh: '深水埗', type: 'DISTRICT' },
      ],
      'New Territories': [
        { name: 'Sha Tin', nameZh: '沙田', type: 'DISTRICT' },
        { name: 'Tsuen Wan', nameZh: '荃灣', type: 'DISTRICT' },
        { name: 'Tuen Mun', nameZh: '屯門', type: 'DISTRICT' },
        { name: 'Yuen Long', nameZh: '元朗', type: 'DISTRICT' },
        { name: 'Tai Po', nameZh: '大埔', type: 'DISTRICT' },
        { name: 'Sai Kung', nameZh: '西貢', type: 'DISTRICT' },
        { name: 'Ma On Shan', nameZh: '馬鞍山', type: 'DISTRICT' },
      ],
    },
  },

  // Common languages in Hong Kong job market
  languages: [
    { code: 'en', name: 'English', nameZh: '英文' },
    { code: 'zh', name: 'Chinese', nameZh: '中文' },
    { code: 'yue', name: 'Cantonese', nameZh: '廣東話' },
    { code: 'cmn', name: 'Mandarin', nameZh: '普通話' },
    { code: 'ja', name: 'Japanese', nameZh: '日文' },
    { code: 'ko', name: 'Korean', nameZh: '韓文' },
    { code: 'fr', name: 'French', nameZh: '法文' },
    { code: 'de', name: 'German', nameZh: '德文' },
    { code: 'es', name: 'Spanish', nameZh: '西班牙文' },
  ],

  // Job categories
  categories: [
    {
      name: 'Technology',
      nameZh: '科技',
      slug: 'technology',
      children: [
        { name: 'Software Development', nameZh: '軟件開發', slug: 'software-development' },
        { name: 'Data Science', nameZh: '數據科學', slug: 'data-science' },
        { name: 'DevOps', nameZh: '開發運維', slug: 'devops' },
        { name: 'Cybersecurity', nameZh: '網絡安全', slug: 'cybersecurity' },
        { name: 'Mobile Development', nameZh: '移動開發', slug: 'mobile-development' },
        { name: 'UI/UX Design', nameZh: '用戶界面設計', slug: 'ui-ux-design' },
      ],
    },
    {
      name: 'Finance',
      nameZh: '金融',
      slug: 'finance',
      children: [
        { name: 'Banking', nameZh: '銀行', slug: 'banking' },
        { name: 'Investment', nameZh: '投資', slug: 'investment' },
        { name: 'Accounting', nameZh: '會計', slug: 'accounting' },
        { name: 'Insurance', nameZh: '保險', slug: 'insurance' },
        { name: 'Risk Management', nameZh: '風險管理', slug: 'risk-management' },
      ],
    },
    {
      name: 'Healthcare',
      nameZh: '醫療保健',
      slug: 'healthcare',
      children: [
        { name: 'Nursing', nameZh: '護理', slug: 'nursing' },
        { name: 'Medical', nameZh: '醫療', slug: 'medical' },
        { name: 'Pharmacy', nameZh: '藥劑', slug: 'pharmacy' },
        { name: 'Allied Health', nameZh: '專職醫療', slug: 'allied-health' },
      ],
    },
    {
      name: 'Education',
      nameZh: '教育',
      slug: 'education',
      children: [
        { name: 'Teaching', nameZh: '教學', slug: 'teaching' },
        { name: 'Training', nameZh: '培訓', slug: 'training' },
        { name: 'Academic', nameZh: '學術', slug: 'academic' },
      ],
    },
    {
      name: 'Sales & Marketing',
      nameZh: '銷售與市場',
      slug: 'sales-marketing',
      children: [
        { name: 'Sales', nameZh: '銷售', slug: 'sales' },
        { name: 'Digital Marketing', nameZh: '數字營銷', slug: 'digital-marketing' },
        { name: 'Business Development', nameZh: '業務發展', slug: 'business-development' },
        { name: 'Public Relations', nameZh: '公共關係', slug: 'public-relations' },
      ],
    },
  ],

  // Common skills
  skills: {
    programming: [
      { name: 'JavaScript', category: 'Programming Languages' },
      { name: 'TypeScript', category: 'Programming Languages' },
      { name: 'Python', category: 'Programming Languages' },
      { name: 'Java', category: 'Programming Languages' },
      { name: 'C#', category: 'Programming Languages' },
      { name: 'Go', category: 'Programming Languages' },
      { name: 'Ruby', category: 'Programming Languages' },
      { name: 'PHP', category: 'Programming Languages' },
      { name: 'Swift', category: 'Programming Languages' },
      { name: 'Kotlin', category: 'Programming Languages' },
    ],
    frameworks: [
      { name: 'React', category: 'Web Frameworks' },
      { name: 'Angular', category: 'Web Frameworks' },
      { name: 'Vue.js', category: 'Web Frameworks' },
      { name: 'Node.js', category: 'Backend Frameworks' },
      { name: 'Express.js', category: 'Backend Frameworks' },
      { name: 'Django', category: 'Backend Frameworks' },
      { name: 'Spring Boot', category: 'Backend Frameworks' },
      { name: '.NET Core', category: 'Backend Frameworks' },
      { name: 'React Native', category: 'Mobile Frameworks' },
      { name: 'Flutter', category: 'Mobile Frameworks' },
    ],
    databases: [
      { name: 'MySQL', category: 'Databases' },
      { name: 'PostgreSQL', category: 'Databases' },
      { name: 'MongoDB', category: 'Databases' },
      { name: 'Redis', category: 'Databases' },
      { name: 'Oracle', category: 'Databases' },
      { name: 'SQL Server', category: 'Databases' },
    ],
    cloud: [
      { name: 'AWS', category: 'Cloud Platforms' },
      { name: 'Azure', category: 'Cloud Platforms' },
      { name: 'Google Cloud', category: 'Cloud Platforms' },
      { name: 'Docker', category: 'DevOps' },
      { name: 'Kubernetes', category: 'DevOps' },
      { name: 'Jenkins', category: 'DevOps' },
      { name: 'Git', category: 'Version Control' },
    ],
    business: [
      { name: 'Project Management', category: 'Business Skills' },
      { name: 'Agile', category: 'Methodologies' },
      { name: 'Scrum', category: 'Methodologies' },
      { name: 'Financial Analysis', category: 'Finance' },
      { name: 'Data Analysis', category: 'Analytics' },
      { name: 'Excel', category: 'Tools' },
      { name: 'PowerPoint', category: 'Tools' },
      { name: 'Salesforce', category: 'CRM' },
    ],
  },

  // Industries
  industries: [
    { name: 'Information Technology', nameZh: '資訊科技', code: 'IT' },
    { name: 'Financial Services', nameZh: '金融服務', code: 'FIN' },
    { name: 'Banking', nameZh: '銀行業', code: 'BANK' },
    { name: 'Insurance', nameZh: '保險業', code: 'INS' },
    { name: 'Healthcare', nameZh: '醫療保健', code: 'HEALTH' },
    { name: 'Education', nameZh: '教育', code: 'EDU' },
    { name: 'Retail', nameZh: '零售', code: 'RETAIL' },
    { name: 'E-commerce', nameZh: '電子商務', code: 'ECOM' },
    { name: 'Manufacturing', nameZh: '製造業', code: 'MFG' },
    { name: 'Real Estate', nameZh: '房地產', code: 'RE' },
    { name: 'Hospitality', nameZh: '酒店業', code: 'HOSP' },
    { name: 'Transportation', nameZh: '運輸', code: 'TRANS' },
    { name: 'Telecommunications', nameZh: '電信', code: 'TELCO' },
    { name: 'Media & Entertainment', nameZh: '媒體娛樂', code: 'MEDIA' },
    { name: 'Consulting', nameZh: '諮詢', code: 'CONSULT' },
    { name: 'Legal Services', nameZh: '法律服務', code: 'LEGAL' },
    { name: 'Government', nameZh: '政府', code: 'GOV' },
    { name: 'Non-Profit', nameZh: '非營利組織', code: 'NPO' },
  ],

  // Sample portals
  portals: [
    {
      name: 'JobsDB',
      baseUrl: 'https://hk.jobsdb.com',
      rateLimit: 2000,
    },
    {
      name: 'Indeed',
      baseUrl: 'https://hk.indeed.com',
      rateLimit: 1500,
    },
    {
      name: 'LinkedIn',
      baseUrl: 'https://www.linkedin.com/jobs',
      rateLimit: 3000,
    },
    {
      name: 'CTgoodjobs',
      baseUrl: 'https://www.ctgoodjobs.hk',
      rateLimit: 1000,
    },
  ],
};