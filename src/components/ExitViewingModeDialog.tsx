import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

interface ExitViewingModeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const ExitViewingModeDialog: React.FC<ExitViewingModeDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
}) => {
    const handleConfirm = () => {
        // Commented out for future implementation
        // onConfirm();

        // Open UX testing calendar in new tab
        window.open('https://cal.com/lever-ai/financial-planner-ux-tester', '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Go to Financial Timeline?</DialogTitle>
                    <DialogDescription className="space-y-2">
                        <p>See how everything connects—past, present, and future.</p>
                        <p>
                            Create a personalized financial timeline that brings your income, savings, debt, and goals into one connected view.
                            Model decisions in context and see how each choice ripples across everything else over time.
                        </p>
                        <p>This is where isolated decisions become a coherent plan—and where clarity compounds.</p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
                        Stay in Calculator
                    </Button>
                    <Button onClick={handleConfirm} disabled={isLoading} className="flex-1">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Go to Timeline →'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExitViewingModeDialog; 