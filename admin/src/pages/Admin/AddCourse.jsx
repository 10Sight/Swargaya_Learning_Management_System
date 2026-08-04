import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCreateCourseMutation } from "@/Redux/AllApi/CourseApi";
import { useCreateModuleMutation } from "@/Redux/AllApi/moduleApi";
import { useCreateQuizMutation } from "@/Redux/AllApi/QuizApi";
import { useCreateAssignmentMutation } from "@/Redux/AllApi/AssignmentApi";
import { useCreateResourceMutation } from "@/Redux/AllApi/resourceApi"; // Added resource API import
import { useGetAllInstructorsQuery } from "@/Redux/AllApi/InstructorApi";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";
import { useGetAllDepartmentsQuery } from "@/Redux/AllApi/DepartmentApi";
import { useLazyGetLinesByDepartmentQuery } from "@/Redux/AllApi/LineApi";
import { useLazyGetMachinesByLineQuery } from "@/Redux/AllApi/MachineApi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormCard, FormInput, FormTextarea, FormSelect } from "@/components/form";
import { CModuleForm } from "@/components/course/CModuleForm";
import { QuizForm } from "@/components/course/QuizForm";
import { AssignmentForm } from "@/components/course/AssignmentForm";
import {
  IconPlus,
  IconLoader,
  IconX,
  IconBook,
  IconArrowLeft,
} from "@tabler/icons-react";
import { toast } from "sonner";

const AddCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useMemo(() => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/instructor")) return "/instructor";
    return "/admin";
  }, [location.pathname]);
  const [createCourse, { isLoading: isCreatingCourse }] = useCreateCourseMutation();
  const [createModule] = useCreateModuleMutation();
  const [createQuiz] = useCreateQuizMutation();
  const [createAssignment] = useCreateAssignmentMutation();
  const [createResource] = useCreateResourceMutation(); // Added resource mutation
  const { data: instructorsData } = useGetAllInstructorsQuery({});

  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const { data: unitsData } = useGetAllUnitsQuery(undefined, { skip: !isSuperAdmin });
  const allUnits = Array.isArray(unitsData?.data) ? unitsData.data : [];

  const instructors = instructorsData?.data?.users || [];
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    level: "L1",
    instructor: "",
    unit: "",
    departments: [], // [{ id, name }]
    lines: [], // [{ id, name, departmentId }]
    machines: [], // [{ id, name, lineId }]
  });

  // Department / Line / Machine — optional multi-select cascading association for the course
  const { data: departmentsData } = useGetAllDepartmentsQuery();
  const allDepartments = departmentsData?.data?.departments || [];

  const [triggerGetLinesByDepartment] = useLazyGetLinesByDepartmentQuery();
  const [triggerGetMachinesByLine] = useLazyGetMachinesByLineQuery();
  const [availableLines, setAvailableLines] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [machinesLoading, setMachinesLoading] = useState(false);

  const selectedDepartmentIds = useMemo(
    () => (formData.departments || []).map((d) => d.id),
    [formData.departments]
  );
  const selectedDepartmentIdsKey = selectedDepartmentIds.join(",");

  useEffect(() => {
    if (selectedDepartmentIds.length === 0) {
      setAvailableLines([]);
      return;
    }

    let cancelled = false;
    setLinesLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          selectedDepartmentIds.map((departmentId) =>
            triggerGetLinesByDepartment(departmentId)
              .unwrap()
              .then((res) => res?.data || [])
              .catch(() => [])
          )
        );
        if (cancelled) return;

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((l) => [l.id, l])).values());
        setAvailableLines(deduped);

        // Drop any previously-selected lines whose department is no longer selected
        setFormData((prev) => ({
          ...prev,
          lines: (prev.lines || []).filter((l) =>
            deduped.some((dl) => dl.id === l.id)
          ),
        }));
      } finally {
        if (!cancelled) setLinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentIdsKey]);

  const selectedLineIds = useMemo(
    () => (formData.lines || []).map((l) => l.id),
    [formData.lines]
  );
  const selectedLineIdsKey = selectedLineIds.join(",");

  useEffect(() => {
    if (selectedLineIds.length === 0) {
      setAvailableMachines([]);
      return;
    }

    let cancelled = false;
    setMachinesLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          selectedLineIds.map((lineId) =>
            triggerGetMachinesByLine(lineId)
              .unwrap()
              .then((res) => res?.data || [])
              .catch(() => [])
          )
        );
        if (cancelled) return;

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((m) => [m.id, m])).values());
        setAvailableMachines(deduped);

        // Drop any previously-selected machines whose line is no longer selected
        setFormData((prev) => ({
          ...prev,
          machines: (prev.machines || []).filter((m) =>
            selectedLineIds.includes(m.lineId)
          ),
        }));
      } finally {
        if (!cancelled) setMachinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLineIdsKey]);

  const toggleDepartmentSelection = (dept) => {
    setFormData((prev) => {
      const isSelected = (prev.departments || []).some((d) => d.id === dept._id);
      return {
        ...prev,
        departments: isSelected
          ? prev.departments.filter((d) => d.id !== dept._id)
          : [...(prev.departments || []), { id: dept._id, name: dept.name }],
      };
    });
  };

  const toggleLineSelection = (line) => {
    setFormData((prev) => {
      const isSelected = (prev.lines || []).some((l) => l.id === line.id);
      return {
        ...prev,
        lines: isSelected
          ? prev.lines.filter((l) => l.id !== line.id)
          : [...(prev.lines || []), { id: line.id, name: line.name, departmentId: line.department }],
      };
    });
  };

  const toggleMachineSelection = (machine) => {
    setFormData((prev) => {
      const isSelected = (prev.machines || []).some((m) => m.id === machine.id);
      return {
        ...prev,
        machines: isSelected
          ? prev.machines.filter((m) => m.id !== machine.id)
          : [...(prev.machines || []), { id: machine.id, name: machine.name, lineId: machine.line }],
      };
    });
  };

  const [modules, setModules] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Module Functions
  const addModule = () => {
    setModules(prev => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        description: "",
        order: prev.length + 1,
        isExpanded: true,
        resources: []
      }
    ]);
  };

  const updateModule = (id, field, value) => {
    setModules(prev => prev.map(module =>
      module.id === id ? { ...module, [field]: value } : module
    ));
  };

  const removeModule = (id) => {
    setModules(prev => prev.filter(module => module.id !== id));
  };

  const toggleModuleExpand = (id) => {
    setModules(prev => prev.map(module =>
      module.id === id ? { ...module, isExpanded: !module.isExpanded } : module
    ));
  };

  const moveModule = (id, direction) => {
    setModules(prev => {
      const index = prev.findIndex(m => m.id === id);
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) {
        return prev;
      }

      const newModules = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];

      // Update order numbers
      return newModules.map((module, idx) => ({ ...module, order: idx + 1 }));
    });
  };

  // Resource Functions
  const addResource = (moduleId) => {
    setModules(prev => prev.map(module =>
      module.id === moduleId
        ? {
          ...module,
          resources: [
            ...module.resources,
            {
              id: Date.now(),
              title: "",
              type: "pdf",
              file: null,
              url: ""
            }
          ]
        }
        : module
    ));
  };

  const updateResource = (moduleId, resourceId, field, value) => {
    setModules(prev => prev.map(module =>
      module.id === moduleId
        ? {
          ...module,
          resources: module.resources.map(resource =>
            resource.id === resourceId ? { ...resource, [field]: value } : resource
          )
        }
        : module
    ));
  };

  const removeResource = (moduleId, resourceId) => {
    setModules(prev => prev.map(module =>
      module.id === moduleId
        ? {
          ...module,
          resources: module.resources.filter(resource => resource.id !== resourceId)
        }
        : module
    ));
  };

  // Quiz Functions
  const addQuiz = () => {
    setQuizzes(prev => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        passingScore: 70,
        questions: [{
          id: Date.now() + 1,
          questionText: "",
          options: [
            { id: Date.now() + 2, text: "", isCorrect: false },
            { id: Date.now() + 3, text: "", isCorrect: false }
          ]
        }]
      }
    ]);
  };

  const updateQuiz = (id, field, value) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === id ? { ...quiz, [field]: value } : quiz
    ));
  };

  const removeQuiz = (id) => {
    setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
  };

  const addQuestionToQuiz = (quizId) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: [
            ...quiz.questions,
            {
              id: Date.now(),
              questionText: "",
              options: [
                { id: Date.now() + 1, text: "", isCorrect: false },
                { id: Date.now() + 2, text: "", isCorrect: false }
              ]
            }
          ]
        }
        : quiz
    ));
  };

  const updateQuestion = (quizId, questionId, field, value) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: quiz.questions.map(q =>
            q.id === questionId ? { ...q, [field]: value } : q
          )
        }
        : quiz
    ));
  };

  const updateQuestionOption = (quizId, questionId, optionId, field, value) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: quiz.questions.map(q =>
            q.id === questionId
              ? {
                ...q,
                options: q.options.map(opt =>
                  opt.id === optionId ? { ...opt, [field]: value } : opt
                )
              }
              : q
          )
        }
        : quiz
    ));
  };

  const addOptionToQuestion = (quizId, questionId) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: quiz.questions.map(q =>
            q.id === questionId
              ? {
                ...q,
                options: [
                  ...q.options,
                  { id: Date.now(), text: "", isCorrect: false }
                ]
              }
              : q
          )
        }
        : quiz
    ));
  };

  const removeOptionFromQuestion = (quizId, questionId, optionId) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: quiz.questions.map(q =>
            q.id === questionId
              ? {
                ...q,
                options: q.options.filter(opt => opt.id !== optionId)
              }
              : q
          )
        }
        : quiz
    ));
  };

  const setCorrectAnswer = (quizId, questionId, optionId) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? {
          ...quiz,
          questions: quiz.questions.map(q =>
            q.id === questionId
              ? {
                ...q,
                options: q.options.map(opt => ({
                  ...opt,
                  isCorrect: opt.id === optionId
                }))
              }
              : q
          )
        }
        : quiz
    ));
  };

  const removeQuestion = (quizId, questionId) => {
    setQuizzes(prev => prev.map(quiz =>
      quiz.id === quizId
        ? { ...quiz, questions: quiz.questions.filter(q => q.id !== questionId) }
        : quiz
    ));
  };

  // Assignment Functions
  const addAssignment = () => {
    setAssignments(prev => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        description: "",
        dueDate: ""
      }
    ]);
  };

  const updateAssignment = (id, field, value) => {
    setAssignments(prev => prev.map(assignment =>
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    ));
  };

  const removeAssignment = (id) => {
    setAssignments(prev => prev.filter(assignment => assignment.id !== id));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) errors.title = "Title is required";
    if (!formData.description.trim()) errors.description = "Description is required";
    if (!formData.category.trim()) errors.category = "Category is required";
    if (!formData.instructor) errors.instructor = "Instructor is required";

    modules.forEach((module, index) => {
      if (!module.title.trim()) errors[`module-${module.id}-title`] = `Module ${index + 1} title is required`;

      // Validate resources
      module.resources.forEach((resource, resIndex) => {
        if (!resource.title.trim()) {
          errors[`module-${module.id}-resource-${resource.id}-title`] = `Resource ${resIndex + 1} title is required`;
        }
        if (resource.type === "URL" && !resource.url.trim()) {
          errors[`module-${module.id}-resource-${resource.id}-url`] = `Resource ${resIndex + 1} URL is required`;
        }
        if (resource.type === "FILE" && !resource.file) {
          errors[`module-${module.id}-resource-${resource.id}-file`] = `Resource ${resIndex + 1} file is required`;
        }
      });
    });

    // Validate quizzes
    quizzes.forEach((quiz, quizIndex) => {
      if (!quiz.title.trim()) errors[`quiz-${quiz.id}-title`] = `Quiz ${quizIndex + 1} title is required`;

      quiz.questions.forEach((question, qIndex) => {
        if (!question.questionText.trim()) {
          errors[`quiz-${quiz.id}-question-${question.id}-text`] = `Question ${qIndex + 1} text is required`;
        }

        // Validate that at least one option is correct
        const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
        if (!hasCorrectAnswer) {
          errors[`quiz-${quiz.id}-question-${question.id}-correct`] = `Question ${qIndex + 1} must have a correct answer`;
        }

        // Validate that all options have text
        question.options.forEach((option, oIndex) => {
          if (!option.text.trim()) {
            errors[`quiz-${quiz.id}-question-${question.id}-option-${option.id}-text`] = `Option ${oIndex + 1} text is required`;
          }
        });

        // Validate that there are at least 2 options
        if (question.options.length < 2) {
          errors[`quiz-${quiz.id}-question-${question.id}-options`] = `Question ${qIndex + 1} must have at least 2 options`;
        }
      });

      // Validate that there's at least one question
      if (quiz.questions.length === 0) {
        errors[`quiz-${quiz.id}-questions`] = `Quiz ${quizIndex + 1} must have at least one question`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setIsLoading(true);

    try {
      // First create the course
      const courseResponse = await createCourse({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        instructor: formData.instructor,
        unit: formData.unit,
        departmentIds: formData.departments.map((d) => d.id),
        lineIds: formData.lines.map((l) => l.id),
        machineIds: formData.machines.map((m) => m.id)
      }).unwrap();

      const courseId = courseResponse.data.id || courseResponse.data._id;

      // Create modules and their resources
      const modulePromises = modules.map(async (module) => {
        const moduleResponse = await createModule({
          courseId,
          title: module.title,
          description: module.description,
          order: module.order
        }).unwrap();

        const moduleId = moduleResponse.data.id || moduleResponse.data._id;

        // Create resources for this module
        if (module.resources && module.resources.length > 0) {
          const resourcePromises = module.resources.map(async (resource) => {
            const resourceFormData = new FormData();
            resourceFormData.append('moduleId', moduleId);
            resourceFormData.append('scope', 'module');
            resourceFormData.append('title', resource.title);
            resourceFormData.append('type', resource.type);
            if (resource.file) resourceFormData.append('file', resource.file);
            if (resource.url) resourceFormData.append('url', resource.url);

            await createResource(resourceFormData).unwrap();
          });

          await Promise.all(resourcePromises);
        }

        return moduleId;
      });

      const moduleIds = await Promise.all(modulePromises);

      // Create quizzes
      const quizPromises = quizzes.map(async (quiz) => {
        const quizResponse = await createQuiz({
          courseId,
          title: quiz.title,
          passingScore: quiz.passingScore || 70,
          questions: quiz.questions.map(q => ({
            questionText: q.questionText,
            options: q.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          }))
        }).unwrap();

        return quizResponse.data.id || quizResponse.data._id;
      });

      await Promise.all(quizPromises);

      // Create assignments
      const assignmentPromises = assignments.map(async (assignment) => {
        const assignmentResponse = await createAssignment({
          courseId,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate
        }).unwrap();

        return assignmentResponse.data.id || assignmentResponse.data._id;
      });

      await Promise.all(assignmentPromises);

      toast.success("Course created successfully!");
      navigate(`${basePath}/courses`);
    } catch (error) {
      console.error("Create course error:", error);
      toast.error(error?.data?.message || "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };


  const { data: configData } = useGetActiveConfigQuery();
  const activeLevels = configData?.data?.levels || [];

  const difficultyOptions = activeLevels.length > 0
    ? activeLevels.map(level => ({
      value: level.name, // Assuming we want to store the level name. Or we could store the level object or a code if available. Storing name for now as per previous schema likely expecting string.
      label: level.name
    }))
    : [
      { value: "L1", label: "L1" },
      { value: "L2", label: "L2" },
      { value: "L3", label: "L3" }
    ];

  // If formData.level is empty or still "BEGINNER", and we have active levels, set default to first level
  useEffect(() => {
    if (activeLevels.length > 0 && (formData.level === "BEGINNER" || formData.level === "L1")) {
      setFormData(prev => ({ ...prev, level: activeLevels[0].name }));
    }
  }, [activeLevels, formData.level]);

  const instructorOptions = instructors.map(instructor => ({
    value: String(instructor._id),
    label: instructor.fullName
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(`${basePath}/courses`)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <IconArrowLeft className="h-4 w-4 mr-1" />
            Back to courses
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Create New Course</h1>
          <p className="text-muted-foreground mt-2">
            Build a comprehensive course with modules, quizzes, and assignments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`${basePath}/courses`)}
          className="gap-2"
        >
          <IconX className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Card */}
        <FormCard
          title={
            <div className="flex items-center gap-2">
              <IconBook className="h-5 w-5" />
              Basic Information
            </div>
          }
          description="Enter the basic details of your course"
          className="border-l-4 border-l-primary"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              id="title"
              name="title"
              label="Course Title *"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter course title"
              error={formErrors.title}
              className="bg-muted/50"
            />

            <FormInput
              id="category"
              name="category"
              label="Category *"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Enter category"
              error={formErrors.category}
              className="bg-muted/50"
            />
          </div>

          <FormTextarea
            id="description"
            name="description"
            label="Description *"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter course description"
            error={formErrors.description}
            className="min-h-32 bg-muted/50"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect
              id="level"
              label="Difficulty Level"
              value={formData.level}
              onValueChange={(value) => handleSelectChange("level", value)}
              options={difficultyOptions}
              placeholder="Select difficulty"
            />

            <FormSelect
              id="instructor"
              label="Instructor *"
              value={formData.instructor}
              onValueChange={(value) => handleSelectChange("instructor", value)}
              options={instructorOptions}
              placeholder="Select instructor"
              error={formErrors.instructor}
            />

            {isSuperAdmin && (
              <FormSelect
                id="unit"
                label="Unit"
                optional
                value={formData.unit || "none"}
                onValueChange={(value) => handleSelectChange("unit", value === "none" ? "" : value)}
                options={[
                  { value: "none", label: "Global (No unit)" },
                  ...allUnits.map((u) => ({ value: u.title, label: u.title })),
                ]}
                placeholder="Select unit (Global if none)"
              />
            )}

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="grid gap-2">
              <Label>Departments</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {allDepartments.length > 0 ? (
                  allDepartments.map((dept) => (
                    <label
                      key={dept._id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.departments?.some((d) => d.id === dept._id)}
                        onCheckedChange={() => toggleDepartmentSelection(dept)}
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">No departments found</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Lines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {!formData.departments?.length ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select at least one department first
                  </p>
                ) : linesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : availableLines.length > 0 ? (
                  availableLines.map((line) => (
                    <label
                      key={line.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.lines?.some((l) => l.id === line.id)}
                        onCheckedChange={() => toggleLineSelection(line)}
                      />
                      <span className="text-sm">{line.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No lines found for the selected department(s)
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Machines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {!formData.lines?.length ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select at least one line first
                  </p>
                ) : machinesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : availableMachines.length > 0 ? (
                  availableMachines.map((machine) => (
                    <label
                      key={machine.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.machines?.some((m) => m.id === machine.id)}
                        onCheckedChange={() => toggleMachineSelection(machine)}
                      />
                      <span className="text-sm">{machine.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No machines found for the selected line(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        </FormCard>

        {/* Modules Card */}
        <FormCard
          title="Course Modules"
          description="Organize your course content into modules. Students will progress through these in order."
          actionButton={
            <Button type="button" onClick={addModule} className="gap-2 bg-primary hover:bg-primary/90">
              <IconPlus className="h-4 w-4" />
              Add Module
            </Button>
          }
          className="border-l-4 border-l-[#3b82f6]"
        >
          {modules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
              <IconBook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No modules added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Module" to start building your course content
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <CModuleForm
                  key={module.id}
                  module={module}
                  index={index}
                  errors={formErrors}
                  onUpdate={updateModule}
                  onRemove={removeModule}
                  onMove={moveModule}
                  onToggleExpand={toggleModuleExpand}
                  onAddResource={addResource}
                  onUpdateResource={updateResource}
                  onRemoveResource={removeResource}
                />
              ))}
            </div>
          )}
        </FormCard>

        {/* Quizzes Card */}
        <FormCard
          title="Quizzes"
          description="Add quizzes to test student knowledge throughout the course"
          actionButton={
            <Button type="button" onClick={addQuiz} className="gap-2 bg-primary hover:bg-primary/90">
              <IconPlus className="h-4 w-4" />
              Add Quiz
            </Button>
          }
          className="border-l-4 border-l-[#22c55e]"
        >
          {quizzes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
              <div className="bg-[#dcfce7] text-[#16a34a] h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">No quizzes added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add quizzes to assess student understanding
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {quizzes.map(quiz => (
                <QuizForm
                  key={quiz.id}
                  quiz={quiz}
                  errors={formErrors}
                  onUpdate={updateQuiz}
                  onRemove={removeQuiz}
                  onAddQuestion={addQuestionToQuiz}
                  onUpdateQuestion={updateQuestion}
                  onRemoveQuestion={removeQuestion}
                  onUpdateQuestionOption={updateQuestionOption}
                  onAddOptionToQuestion={addOptionToQuestion}
                  onRemoveOptionFromQuestion={removeOptionFromQuestion}
                  onSetCorrectAnswer={setCorrectAnswer}
                />
              ))}
            </div>
          )}
        </FormCard>

        {/* Assignments Card */}
        <FormCard
          title="Assignments"
          description="Add practical assignments for students to apply their knowledge"
          actionButton={
            <Button type="button" onClick={addAssignment} className="gap-2 bg-primary hover:bg-primary/90">
              <IconPlus className="h-4 w-4" />
              Add Assignment
            </Button>
          }
          className="border-l-4 border-l-[#a855f7]"
        >
          {assignments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
              <div className="bg-[#f3e8ff] text-[#9333ea] h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">No assignments added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add assignments for practical application of concepts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => (
                <AssignmentForm
                  key={assignment.id}
                  assignment={assignment}
                  onUpdate={updateAssignment}
                  onRemove={() => removeAssignment(assignment.id)}
                />
              ))}
            </div>
          )}
        </FormCard>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`${basePath}/courses`)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isCreatingCourse}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
          >
            {(isLoading || isCreatingCourse) && <IconLoader className="h-4 w-4 animate-spin" />}
            {(isLoading || isCreatingCourse) ? "Creating Course..." : "Create Course"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCourse;