import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

const DOTS = "...";

const range = (start, end) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
};

// Standard "boundary + sibling + dots" pagination model, e.g. 1 2 3 ... 8 9 10
const getPageNumbers = (currentPage, totalPages, siblingCount = 1, boundaryCount = 1) => {
    const totalSlots = boundaryCount * 2 + siblingCount * 2 + 3;

    if (totalPages <= totalSlots) {
        return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, boundaryCount + 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - boundaryCount);

    const showLeftDots = leftSiblingIndex > boundaryCount + 2;
    const showRightDots = rightSiblingIndex < totalPages - boundaryCount - 1;

    const firstPages = range(1, boundaryCount);
    const lastPages = range(totalPages - boundaryCount + 1, totalPages);

    if (!showLeftDots && showRightDots) {
        const leftItemCount = boundaryCount + 2 * siblingCount + 2;
        return [...range(1, leftItemCount), DOTS, ...lastPages];
    }

    if (showLeftDots && !showRightDots) {
        const rightItemCount = boundaryCount + 2 * siblingCount + 2;
        return [...firstPages, DOTS, ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    return [...firstPages, DOTS, ...range(leftSiblingIndex, rightSiblingIndex), DOTS, ...lastPages];
};

const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }) => {
    const [goToPage, setGoToPage] = useState("");

    // Clear the "go to page" input whenever the page changes elsewhere (e.g. via the buttons)
    useEffect(() => {
        setGoToPage("");
    }, [currentPage]);

    if (totalPages <= 1) return null;

    const pages = getPageNumbers(currentPage, totalPages);

    const handleGoToPage = () => {
        const page = parseInt(goToPage, 10);
        if (!page || isNaN(page)) return;
        const clamped = Math.min(Math.max(page, 1), totalPages);
        onPageChange(clamped);
    };

    const handleGoToPageKeyDown = (e) => {
        if (e.key === "Enter") handleGoToPage();
    };

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Previous page"
                >
                    <IconChevronLeft className="h-4 w-4" />
                </Button>

                {pages.map((page, index) =>
                    page === DOTS ? (
                        <span key={`dots-${index}`} className="px-2 text-sm text-muted-foreground select-none">
                            {DOTS}
                        </span>
                    ) : (
                        <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${page === currentPage ? "bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff]" : ""}`}
                            onClick={() => onPageChange(page)}
                            aria-current={page === currentPage ? "page" : undefined}
                        >
                            {page}
                        </Button>
                    )
                )}

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Next page"
                >
                    <IconChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Go to page</span>
                <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={goToPage}
                    onChange={(e) => setGoToPage(e.target.value)}
                    onKeyDown={handleGoToPageKeyDown}
                    placeholder={String(currentPage)}
                    className="h-8 w-16 text-center px-1"
                />
                <Button variant="outline" size="sm" className="h-8" onClick={handleGoToPage}>
                    Go
                </Button>
            </div>
        </div>
    );
};

export default Pagination;
