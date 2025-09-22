import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconHelpCircle,
  IconClock,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const QuizList = ({ quizzes, courseId, onRefetch }) => {
  const navigate = useNavigate();

  // Ensure quizzes is always an array
  const quizArray = Array.isArray(quizzes) ? quizzes : [];

  if (quizArray.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <IconHelpCircle className="h-12 w-12 text-muted-foreground/60 mb-4" />
          <p className="text-muted-foreground font-medium">No quizzes yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add quizzes to test student knowledge
          </p>
          <Button 
            onClick={() => navigate(`/admin/add-quiz/${courseId}`)} 
            className="mt-4"
          >
            Add Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Course Quizzes</h3>
          <p className="text-sm text-muted-foreground">
            Tests to assess student understanding
          </p>
        </div>
        <Button onClick={() => navigate(`/admin/add-quiz/${courseId}`)}>
          <IconPlus className="h-4 w-4 mr-2" />
          Add Quiz
        </Button>
      </div>

      <div className="grid gap-4">
        {quizArray.map((quiz) => (
          <Card key={quiz._id} className="group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{quiz.title}</CardTitle>
                  <CardDescription>{quiz.description}</CardDescription>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/edit-quiz/${quiz._id}`)}
                  >
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <IconHelpCircle className="h-4 w-4" />
                  <span>
                    {quiz.questions?.length || 0} question
                    {quiz.questions?.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {quiz.passingScore && (
                  <Badge variant="outline">
                    Passing: {quiz.passingScore}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuizList;