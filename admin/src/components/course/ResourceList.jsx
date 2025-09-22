import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconPlus,
  IconPaperclip,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const ResourceList = ({ courseId, modules }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Course Resources</h3>
          <p className="text-sm text-muted-foreground">
            Supplementary materials organized by module
          </p>
        </div>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <IconPaperclip className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <p className="text-muted-foreground font-medium">No modules found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add modules first to organize resources
            </p>
            <Button 
              onClick={() => navigate(`/admin/add-module/${courseId}`)} 
              className="mt-4"
            >
              Add Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {modules.map((module) => (
            <Card key={module._id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>{module.title}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/add-resource/${courseId}`)}
                  >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {module.resources?.length > 0 
                    ? `${module.resources.length} resource(s) available` 
                    : "No resources yet. Add resources to this module."}
                </p>
                {module.resources?.length > 0 && (
                  <Button 
                    variant="link" 
                    className="p-0 mt-2"
                    onClick={() => navigate(`/admin/module-resources/${module._id}`)}
                  >
                    View Resources
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceList;