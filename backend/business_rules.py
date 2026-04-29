
#########################################################################
# business_rules.py

# business_rules.py

BUSINESS_CATEGORIES = {

    "Advertising & Marketing": [
        "Advertising & Marketing (Other)",
        "Advertising Agency",
        "Branding",
        "Copywriter or Writer",
        "Digital Marketing",
        "Embroidery",
        "Graphic Designer",
        "Home Automation",
        "Lead Generation",
        "Marketing Consultant",
        "Media Services",
        "Online Marketing",
        "Podcasts",
        "Print Advertising",
        "Printer",
        "Printer - Digital",
        "Printer - Large Format",
        "Printer - Offset",
        "Promotional Products",
        "Public Relation",
        "Publisher",
        "Relationship Marketing",
        "Sales Promotion",
        "Search Engine Optimisation",
        "Sign Company",
        "Social Media",
        "Television Advertising",
        "Videographer or Film Producer",
        "Web Design",
        "Web Development",
        "Web Shop Services"
    ],

    "Agriculture": [
        "Agriculture (Other)",
        "Agronomist"
    ],

    "Animals": [
        "Animals (Other)",
        "Aquarium or Fish",
        "Boarding",
        "Dog Trainer",
        "Grooming",
        "Pet Foods",
        "Pet Shop",
        "Veterinarian"
    ],

    "Architecture & Engineering": [
        "3D Modelling",
        "Architect",
        "Architectural Services",
        "Architecture & Engineering (Other)",
        "Civil or Structural Engineer",
        "Feng Shui",
        "Garden and Landscape Architect",
        "Industrial Automation",
        "Interior Architecture",
        "Landscape Services",
        "Surveyor",
        "Tree Services",
        "Vaastu Consultant"
    ],

    "Art & Entertainment": [
        "Art & Entertainment (Other)",
        "Artist",
        "Disc Jockey (DJ)",
        "Entertainer",
        "Musicians"
    ],

    "Car & Motorcycle": [
        "Auto Glass",
        "Auto or Car Body Shop",
        "Auto or Car Detailing",
        "Auto or Car Parts & Accessories",
        "Auto or Car Rental or Leasing",
        "Auto or Car Repair",
        "Auto or Car Sales",
        "Automotive Expert",
        "Car & Motorcycle (Other)",
        "Commercial Vehicle Dealers",
        "Driving Instructor",
        "Gas Station",
        "Tire Sales or Replacement",
        "Vehicle Cleaning or Car Wash"
    ],

    "Computer & Programming": [
        "App Developer",
        "Cloud Services",
        "Computer & Programming (Other)",
        "Computer Retailer",
        "Computer Software",
        "Computer Training",
        "Data Security",
        "ERP Software",
        "IT & Networks",
        "IT Consultants",
        "Programmer"
    ],

    "Construction": [
        "Balcony or Veranda",
        "Blacksmith",
        "Bricklayer or Stonemason",
        "Builder or General Contractor",
        "Cabinet Maker",
        "Carpenter",
        "Cement or Concrete",
        "Commercial Builder",
        "Construction (Other)",
        "Construction Project Management",
        "Counter Tops",
        "Demolition Contractor",
        "Drainage",
        "Drywall",
        "Electrician - Commercial",
        "Electrical Contractor",
        "Energy Services",
        "Environmental Services",
        "Elevators",
        "Fences",
        "Fireplace & Oven Builder",
        "Flooring",
        "Garage Doors",
        "Glass",
        "Ground Works",
        "Heating Engineer",
        "HVAC - Heating & Air",
        "Insulation",
        "Interior Design - Commercial",
        "Interior Design - Residential",
        "Kitchen Construction",
        "Main Contractor",
        "Metal Work",
        "Painter",
        "Pest Control",
        "Pipework",
        "Plasterer",
        "Plumbing",
        "Pools, Spas & Saunas",
        "Power Generator",
        "Protective Coatings or Sealants",
        "Renovations or Remodeling",
        "Rental Equipment",
        "Restoration",
        "Roofing & Gutters",
        "Scaffolding",
        "Septic Systems",
        "Shutters & Awnings",
        "Single House Builder",
        "Solar",
        "Tile Worker",
        "Waterproofing-Weatherproofing",
        "Window Treatments",
        "Windows & Doors"
    ],

    "Consulting": [
        "Business Advisor",
        "Business Broker",
        "Business Consultant",
        "Business Consultant - Management",
        "Business Consultant - Organization & Process",
        "Business Consultant - Quality Management",
        "Business Consultant - Small Business",
        "Business Consultant - Turnaround",
        "Consulting (Other)",
        "Diversity, Equity and Inclusion",
        "Energy Consulting",
        "Professional Organizer",
        "Tendering"
    ],

    "Employment Activities": [
        "Administrative Services",
        "Employment Activities (Other)",
        "Employment Agency",
        "Employment Law Consultant",
        "Human Resources",
        "Recruiter",
        "Virtual Assistant"
    ],

    "Event & Business Service": [
        "Call Center or Answering Service",
        "Corporate Events",
        "Event & Business-Service (Other)",
        "Event Manager or Marketer",
        "Event Planner",
        "Event Rentals",
        "Event Venue or Room Rental",
        "Hotel",
        "Office Services",
        "Technicians - Audio, Video, Events",
        "Translator or Language Services"
    ],

    "Finance & Insurance": [
        "Asset Finance",
        "Banking Services",
        "Barter & Cryptocurrency",
        "Collections",
        "Commercial Bank Services",
        "Commercial Insurance",
        "Commercial Loans",
        "Company Secretary",
        "Consumer Loan",
        "Credit Card or Merchant Services",
        "Credit Repair",
        "Finance & Insurance (Other)",
        "Financial Advisor",
        "Financial Investments",
        "Financial Trustee",
        "Foreign Exchange",
        "General Insurance",
        "Group Benefits",
        "Health Insurance",
        "Insurance Adjuster",
        "Insurance Consultant",
        "Insolvency Practitioner",
        "Life and Disability Insurance",
        "Mutual Funds",
        "Pensions",
        "Property & Casualty Insurance",
        "Property Construction Loan",
        "Residential Mortgages",
        "Stock Broker",
        "Vehicle Insurance",
        "Wealth Management"
    ],

    "Food & Beverage": [
        "Baker",
        "Beverage Distributor",
        "Beverage Service",
        "Caterer",
        "Chocolatier",
        "Confectionery",
        "Food & Beverage (Other)",
        "Food Service",
        "Restaurant",
        "Tea Merchant",
        "Wine Merchant or Wine"
    ],

    "Health & Wellness": [
        "Acupuncture",
        "Alternative Wellness",
        "Chiropractor",
        "Counselor or Psychotherapist",
        "Dentist",
        "Doctor or Physician",
        "Essential Oils",
        "Health & Wellness (Other)",
        "Health & Wellness Products",
        "Health & Wellness Services",
        "Health Coach",
        "Health Facility or Gym or Club",
        "Hearing or Audiology",
        "Hospice",
        "In-Home Care",
        "Medical Services",
        "Naturopaths",
        "Nutritionist",
        "Nutritional Supplements",
        "Optician",
        "Orthodontist",
        "Personal Trainer - Fitness",
        "Pharmacist",
        "Physical Therapist",
        "Wellness Coach"
    ],

    "Legal & Accounting": [
        "Accounting Services",
        "Auditor",
        "Bookkeeping",
        "Business Law",
        "Certified Public Accountant (CPA)",
        "Civil Law",
        "Company Formation",
        "Conveyancing",
        "Criminal Defense Law",
        "Employment or Labor Law",
        "Estate Planning Law",
        "Family Law",
        "Government Services",
        "Immigration Law",
        "Intellectual Property Law",
        "Law Enforcement Officer",
        "Lawyer",
        "Legal & Accounting (Other)",
        "Legal Service Plan",
        "Mediator",
        "Notary",
        "Payroll Service",
        "Real Estate Law",
        "Tax Advisor",
        "Tax Law",
        "Wills or Trusts"
    ],

    "Manufacturing": [
        "Apparel",
        "Basic Metals",
        "Beverages",
        "Chemical Products",
        "Commercial Vehicle Manufacture",
        "Computer, Electronics & Optical",
        "Electric Energy Generation",
        "Electrical Equipment Manufacture",
        "Flooring Manufacture",
        "Food Products",
        "Furniture Manufacture",
        "Leather Products",
        "Lighting Manufacture",
        "Machinery & Equipment Manufacture",
        "Manufacturing (Other)",
        "Metal Fabrication",
        "Motor Vehicles",
        "Non Metallic Minerals",
        "Packaging",
        "Paint Manufacture",
        "Paper & Paper Products",
        "Petroleum Products",
        "Pharmaceutical",
        "Rubber & Plastic",
        "Textiles",
        "Tobacco Products",
        "Transportation Equipment",
        "Wood & Cork (except Furniture)"
    ],

    "Organizations & Others": [
        "Chambers or Associations",
        "Non-Profits or Fundraising Organizations",
        "Organizations & Other (Other)"
    ],

    "Personal Services": [
        "Astrologist",
        "Celebrant",
        "Color & Style Consultant",
        "Cosmetics or Skin Care",
        "Dry Cleaning or Laundry",
        "Funeral Planning or Services",
        "Hair Stylist",
        "Personal Services (Other)",
        "Salon or Spa",
        "Senior Service Provider",
        "Wedding Planner"
    ],

    "Real Estate Services": [
        "Buying Agent",
        "Carpet, Upholstery Cleaner",
        "Cleaning Service",
        "Commercial Cleaning",
        "Commercial Property Management",
        "Commercial Real Estate",
        "Electricity & Gas Dealers",
        "Home Inspection",
        "Property Management",
        "Real Estate Appraisal",
        "Real Estate Development",
        "Real Estate Inspector",
        "Real Estate Investments",
        "Real Estate Maintenance or Care Taker",
        "Real Estate Planning Consultant",
        "Real Estate Rentals",
        "Real Estate Services (Other)",
        "Residential Real Estate Agent",
        "Title Services",
        "Waste Disposal",
        "Window Cleaning"
    ],

    "Repair": [
        "Appliance Repair",
        "Computer Repair",
        "Furniture Repair or Upholstery",
        "Machinery & Equipment Repair",
        "Repair (Other)"
    ],

    "Security & Investigation": [
        "CCTV",
        "Fire Protection",
        "Investigative Services or Detective",
        "Occupational Safety",
        "Security (Other)",
        "Security Personnel",
        "Security Systems"
    ],

    "Sports & Leisure": [
        "Martial Arts",
        "Sports & Leisure (Other)",
        "Swimming",
        "Yoga or Pilates or Qi-gong Trainer"
    ],

    "Telecommunications": [
        "Mobile Telecommunications",
        "Telecommunications (Other)",
        "Telecommunications Products or Services"
    ],

    "Training & Coaching": [
        "Business Training or Coach",
        "Communication Coach",
        "Education Services or Tutor",
        "Educational Facility",
        "Language Teaching",
        "Leadership Coach",
        "Learning Centre",
        "Life Coach",
        "Management Coach",
        "Mind Coach",
        "Online Training",
        "Sales Training or Coach",
        "Training & Coaching (Other)"
    ],

    "Transport & Shipping": [
        "Commercial Transportation",
        "Courier",
        "Freight Service",
        "Moving Company",
        "Shuttle or Limousine Service",
        "Transport & Shipping (Other)"
    ],

    "Travel": [
        "Ticketing",
        "Tours or Tour Guide",
        "Travel (Other)",
        "Travel Agent"
    ],

    "Trades": [
        "Air Conditioning or Ventilation",
        "Builder",
        "Concrete",
        "Interior Design - Commercial",
        "Home Decor",
        "Kitchen Construction",
        "Pipework",
        "Trades (Other)"
    ]
}



def get_categories():
    return list(BUSINESS_CATEGORIES.keys())


def get_subcategories(category: str):
    return BUSINESS_CATEGORIES.get(category, [])

