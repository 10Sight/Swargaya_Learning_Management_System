import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  Info
} from 'lucide-react';

const DepartmentCancellationBanner = ({
  department,
  className = '',
  showContactInfo = true,
  variant = 'destructive'
}) => {
  if (!department || department.status !== 'CANCELLED') {
    return null;
  }

  // Extract cancellation reason from notes if exists
  const extractCancellationReason = (notes) => {
    if (!notes) return null;

    const lines = notes.split('\n');
    const cancelledLine = lines.find(line => line.startsWith('CANCELLED:'));

    if (cancelledLine) {
      // Extract reason between "CANCELLED: " and the timestamp
      const match = cancelledLine.match(/CANCELLED: (.+?) \(/);
      return match ? match[1].trim() : null;
    }

    return null;
  };

  const cancellationReason = extractCancellationReason(department.notes);
  const hasReason = cancellationReason && cancellationReason.length > 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Main Cancellation Alert */}
      <Alert variant={variant} className="border-2 border-[#fecaca] bg-[#fef2f2] mb-4">
        <XCircle className="h-6 w-6 text-[#dc2626]" />
        <AlertTitle className="text-[#991b1b] text-lg font-bold flex items-center gap-2">
          Department Cancelled
          <AlertTriangle className="h-5 w-5" />
        </AlertTitle>
        <AlertDescription className="text-[#b91c1c] mt-2">
          <div className="space-y-2">
            <p className="font-medium">
              This department "{department.name}" has been cancelled and is no longer active.
            </p>

            {hasReason && (
              <div className="mt-3 p-3 bg-[#fee2e2] rounded-md border border-[#fecaca]">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-[#dc2626] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#991b1b] text-sm">Cancellation Reason:</p>
                    <p className="text-[#b91c1c] text-sm mt-1">{cancellationReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Contact Information Card */}
      {showContactInfo && (
        <Card className="border-[#fed7aa] bg-[#fff7ed]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#ffedd5] rounded-full">
                <Phone className="h-5 w-5 text-[#ea580c]" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-[#9a3412] mb-2">
                  Need Help?
                </h4>
                <p className="text-[#c2410c] text-sm mb-3">
                  If you have questions about this cancellation or need assistance with alternative options,
                  please contact our support team.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#c2410c] border-[#fdba74] hover:bg-[#ffedd5]"
                    onClick={() => window.location.href = 'mailto:support@example.com'}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Support
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#c2410c] border-[#fdba74] hover:bg-[#ffedd5]"
                    onClick={() => window.location.href = 'tel:+1-555-0123'}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Support
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DepartmentCancellationBanner;
