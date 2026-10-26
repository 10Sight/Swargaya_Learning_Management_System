import Level1OJTTable from "./Level1OJTTable";
import Level1MouldingOJTTable from "./Level1MouldingOJTTable";
import Level1HCBCOJTTable from "./Level1HCBCOJTTable";
import Level2OJTTable from "./Level2OJTTable";
import Level3OJTTable from "./Level3OJTTable";
import Level4OJTTable from "./Level4OJTTable";

/**
 * Modular Registry of On Job Training evaluation sheets.
 * Supports:
 * 1. Multiple levels (L1, L2, L3...)
 * 2. Multiple sheets with the SAME level (via unique `sheetKey`)
 * 3. Department-specific sheets for the SAME level (via `departmentNames` with default fallback)
 */
export const OJT_SHEET_REGISTRY = {
    // --- Level 1 Sheets ---
    "L1_DEFAULT": {
        sheetKey: "L1_DEFAULT",
        order: 0,
        levelName: "L1",
        title: "Level-1 Practical Evaluation (Production & Cycle Time)",
        docNo: "MMI/OJT/01/001",
        revNo: "06",
        revDate: "15-06-2024",
        description: "15-Day Production Output, Parts Produced, Cycle Time Target vs Actual, NC Tag & Customer Complaint Compliance",
        focusAreas: ["Production Target", "OK Parts & Rejections", "Cycle Time", "NC Tag (Critical)", "SOS Follow", "Customer Complaint"],
        defaultMarks: 36,
        isDefault: true,
        departmentNames: [], // Empty means applicable to all departments
        departmentLabel: "All Departments (General)",
        component: Level1OJTTable
    },
    "L1_MOULDING": {
        sheetKey: "L1_MOULDING",
        order: 0,
        levelName: "L1",
        title: "Level-1 Practical Evaluation of On the Job Training (Moulding)",
        docNo: "F/IM/01/010",
        revNo: "4",
        revDate: "10.08.2022",
        description: "3-Day Moulding Evaluation (F/IM/01/010): Machine Basics, 50-Part Learning Check, AMC & Mould Loading/Unloading, Pass threshold Avg ≥40 samples",
        focusAreas: [
            "Machine Basics, SOS & Material Flow",
            "Part Handling & Degating",
            "Manual/Semiauto/Auto Operation",
            "Mould Loading/Unloading & AMC",
            "50-Part Check & Pass Avg ≥ 40"
        ],
        defaultMarks: 50,
        isDefault: false,
        departmentNames: ["Moulding", "Molding", "Injection Moulding", "IM"],
        departmentLabel: "Moulding Department (F/IM/01/010)",
        component: Level1MouldingOJTTable
    },
    "L1_HCBC": {
        sheetKey: "L1_HCBC",
        order: 0,
        levelName: "L1",
        title: "Level-1 Practical Evaluation of On the Job Training (HCBC)",
        docNo: "F/SC/01/005",
        revNo: "0",
        revDate: "10.08.2022",
        description: "3-Day Surface Coating / HCBC Evaluation (F/SC/01/005): Machine Basics, Startup Instructions, 48-Job Hands-on, Defect Knowledge, Pass threshold OK ≥ 60%",
        focusAreas: [
            "Machine Basics & Startup Instructions",
            "WI, Observation & Material Flow",
            "Line Visuals & Visual Inspection",
            "Visual Defects & NC Parts Handling",
            "Total Produced vs OK Parts (Pass ≥ 60%)"
        ],
        defaultMarks: 100,
        isDefault: false,
        departmentNames: ["HCBC", "Hard Coat", "Hard Coating", "Surface Coating", "SC", "Paint", "Paint Shop"],
        departmentLabel: "HCBC Department (F/SC/01/005)",
        component: Level1HCBCOJTTable
    },

    // --- Level 2 Sheets ---
    "L2_DEFAULT": {
        sheetKey: "L2_DEFAULT",
        order: 1,
        levelName: "L2",
        title: "Level-2 Practical Evaluation of On the Job Training",
        docNo: "MMI/OJT/01/002",
        revNo: "3",
        revDate: "02/05/2024",
        description: "3-Day Shopfloor Evaluation: Daily Production Targets, 30 Standard Quality & WCM Checkpoints (2 Marks Each), Rubric Scoring (Pass ≥80%)",
        focusAreas: [
            "3-Day Production, Rejection & Cycle Time",
            "Product Knowledge & Poka-Yoke Verification",
            "7QC Report & 5S Score Awareness",
            "Machine Troubleshooting & 4M Change",
            "Target Achieved Rubrics (Pass ≥ 80%)"
        ],
        defaultMarks: 72,
        isDefault: true,
        departmentNames: [],
        departmentLabel: "All Departments (Molding, HCBC, Assembly)",
        component: Level2OJTTable
    },

    // --- Level 3 Sheets ---
    "L3_DEFAULT": {
        sheetKey: "L3_DEFAULT",
        order: 2,
        levelName: "L3",
        title: "Level-3 Practical Evaluation of On the Job Training",
        docNo: "MMI/OJT/01/003",
        revNo: "2",
        revDate: "02/05/2024",
        description: "3-Day Root Cause & Problem Solving: 5G/5W1H/5-Why/4M1E Analysis Reports, Standard Kaizen, NC Part Decision Making (10 Parts), WCM & LOTO",
        focusAreas: [
            "Root Cause Analysis Reports (5W1H, 5-Why, 4M1E)",
            "Standard Kaizen & Line Balancing",
            "NC Parts Decision Making (10 Parts Practical)",
            "4M Change, LOTO & Customer Characteristics",
            "Pass ≥ 80% Evaluation Criteria"
        ],
        defaultMarks: 66,
        isDefault: true,
        departmentNames: [],
        departmentLabel: "All Departments (Common Sheet)",
        component: Level3OJTTable
    },

    // --- Level 4 Sheets ---
    "L4_DEFAULT": {
        sheetKey: "L4_DEFAULT",
        order: 3,
        levelName: "L4",
        title: "Level-4 Practical Evaluation of On the Job Training",
        docNo: "MMI/OJT/01/004",
        revNo: "3",
        revDate: "02/05/2024",
        description: "3-Day Industrial Engineering & Systems Audit: Safety Board, Motion/Time Study, 2-Video Camera Method, PPSR/CAPA, SWAI & Layered Audits",
        focusAreas: [
            "Safety Board Step 0-3 & Golden Zone",
            "Motion/Time Study & Line Balancing",
            "2-Video Camera Method & OEE Productivity",
            "PPSR / CAPA Analysis & Gap Flush",
            "Pass ≥ 80% Evaluation Criteria"
        ],
        defaultMarks: 58,
        isDefault: true,
        departmentNames: [],
        departmentLabel: "All Departments (Common Sheet)",
        component: Level4OJTTable
    }
};

/**
 * LocalStorage key for user-configured department sheet assignments
 */
const CUSTOM_DEPT_MAPPINGS_KEY = "OJT_CUSTOM_DEPT_MAPPINGS";

/**
 * Returns any custom department mappings defined by the user in the UI.
 * Format: { [sheetKey]: string[] } (array of department names, or [] for all)
 */
export const getCustomDepartmentMappings = () => {
    try {
        const raw = localStorage.getItem(CUSTOM_DEPT_MAPPINGS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse custom OJT department mappings:", e);
    }
    return {};
};

/**
 * Saves user's custom department mapping for a specific sheet template.
 * @param {string} sheetKey
 * @param {string[]} departmentNames
 */
export const saveCustomDepartmentMapping = (sheetKey, departmentNames = []) => {
    try {
        const current = getCustomDepartmentMappings();
        current[sheetKey] = Array.isArray(departmentNames) ? departmentNames : [];
        localStorage.setItem(CUSTOM_DEPT_MAPPINGS_KEY, JSON.stringify(current));
        return current;
    } catch (e) {
        console.error("Failed to save custom OJT department mapping:", e);
        return {};
    }
};

/**
 * Resets a single sheet's department mapping back to its system default.
 * @param {string} sheetKey
 */
export const resetSingleDepartmentMapping = (sheetKey) => {
    try {
        const current = getCustomDepartmentMappings();
        delete current[sheetKey];
        localStorage.setItem(CUSTOM_DEPT_MAPPINGS_KEY, JSON.stringify(current));
        return current;
    } catch (e) {
        console.error("Failed to reset custom OJT department mapping:", e);
        return {};
    }
};

/**
 * Resets all department mappings to system defaults.
 */
export const resetDepartmentMappings = () => {
    try {
        localStorage.removeItem(CUSTOM_DEPT_MAPPINGS_KEY);
    } catch (_) {}
};

/**
 * Returns an array of all registered sheet templates with any user-customized department assignments applied.
 */
export const getAllRegisteredSheets = () => {
    const customMappings = getCustomDepartmentMappings();

    return Object.values(OJT_SHEET_REGISTRY).map(sheet => {
        if (customMappings[sheet.sheetKey] !== undefined) {
            const depts = customMappings[sheet.sheetKey];
            const isAll = !depts || depts.length === 0 || depts.includes("ALL");
            return {
                ...sheet,
                departmentNames: isAll ? [] : depts,
                departmentLabel: isAll ? "All Departments" : `${depts.join(", ")}`,
                isDefault: isAll || sheet.isDefault
            };
        }
        return sheet;
    });
};

/**
 * Returns all sheets available for a given level, ordered with department-specific matches first.
 * @param {Object} params
 * @param {number|string} params.levelOrder
 * @param {string} [params.departmentName]
 */
export const getSheetsForLevelAndDepartment = ({ levelOrder = 0, departmentName = "" }) => {
    const targetOrder = Number(levelOrder) || 0;
    const sheetsForLevel = getAllRegisteredSheets().filter(s => s.order === targetOrder);

    const normDept = (departmentName || "").trim().toLowerCase();

    return sheetsForLevel.map(sheet => {
        const isDeptSpecific = Array.isArray(sheet.departmentNames) && sheet.departmentNames.length > 0;
        const matchesDept = isDeptSpecific && normDept && sheet.departmentNames.some(d => {
            const lower = d.toLowerCase();
            return normDept.includes(lower) || lower.includes(normDept);
        });

        return {
            ...sheet,
            isDeptSpecific,
            matchesDept,
            isRecommended: Boolean(matchesDept || (!isDeptSpecific && sheet.isDefault))
        };
    }).sort((a, b) => {
        // Department-matched sheets come first
        if (a.matchesDept && !b.matchesDept) return -1;
        if (!a.matchesDept && b.matchesDept) return 1;
        // Default sheets come next
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
    });
};

/**
 * Returns the exact sheet configuration:
 * 1. By `sheetKey` if explicitly specified in the OJT record.
 * 2. By matching `(levelOrder, departmentName)` if a department-specific sheet exists.
 * 3. By fallback to default sheet for that `levelOrder`.
 * 4. Fallback to L1_DEFAULT if nothing matches.
 *
 * @param {Object|number|string} params
 */
export const getOJTSheetConfig = (params = {}) => {
    // Backward compatibility if called as getOJTSheetConfig(levelOrder)
    if (typeof params === "number" || typeof params === "string") {
        params = { levelOrder: params };
    }

    const { sheetKey, levelOrder = 0, departmentName = "" } = params;

    // 1. Exact match by sheetKey
    if (sheetKey) {
        const allSheets = getAllRegisteredSheets();
        const found = allSheets.find(s => s.sheetKey === sheetKey);
        if (found) return found;
        if (OJT_SHEET_REGISTRY[sheetKey]) return OJT_SHEET_REGISTRY[sheetKey];
    }

    // 2. Resolve by levelOrder & departmentName
    const matchingSheets = getSheetsForLevelAndDepartment({ levelOrder, departmentName });
    if (matchingSheets.length > 0) {
        // First item is either department match or default
        return matchingSheets[0];
    }

    // 3. Absolute fallback
    return OJT_SHEET_REGISTRY["L1_DEFAULT"];
};

export default OJT_SHEET_REGISTRY;
