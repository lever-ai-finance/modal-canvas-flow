import { dateStringToDaysSinceBirth, daysSinceBirthToDateString } from '../contexts/PlanContext';
import type { Plan } from '../contexts/PlanContext';
import type { Datum } from './viz_utils';

type ZoomTransform = {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  skewX?: number;
  skewY?: number;
};

type ZoomLike = {
  transformMatrix: ZoomTransform;
  setTransformMatrix: (matrix: ZoomTransform) => void;
};

type XScaleLike = ((value: number) => number) & {
  invert: (value: number) => number;
};

type AnimateZoom = (
  startState: { scaleX: number; translateX: number },
  endState: { scaleX: number; translateX: number },
  onUpdate: (state: { scaleX: number; translateX: number }) => void
) => void;

interface CreateZoomHandlersOptions {
  animateZoom: AnimateZoom;
  zoom: ZoomLike;
  xScale: XScaleLike;
  width: number;
  netWorthData: Datum[];
  currentDay: number;
  plan: Plan | null;
  leftPadding?: number;
  ytdPaddingDays?: number;
  mtdPaddingDays?: number;
  ytdTranslatePad?: number;
  mtdTranslatePad?: number;
}

export const createZoomHandlers = ({
  animateZoom,
  zoom,
  xScale,
  width,
  netWorthData,
  currentDay,
  plan,
  leftPadding = 80,
  ytdPaddingDays = 15,
  mtdPaddingDays = 2,
  ytdTranslatePad = 60,
  mtdTranslatePad = 60,
}: CreateZoomHandlersOptions) => {
  const handleZoomToWindow = ({
    years = 0,
    months = 0,
    days = 0,
  }: { years?: number; months?: number; days?: number }) => {
    if (!netWorthData.length) return;
    const daysPerYear = 365;
    const daysPerMonth = 30; // Approximate
    const windowStart = currentDay;
    const windowEnd =
      currentDay +
      (years * daysPerYear) +
      (months * daysPerMonth) +
      days;
    const maxDate = Math.max(...netWorthData.map(d => d.date));
    const clampedEnd = Math.min(windowEnd, maxDate);

    const windowWidth = clampedEnd - windowStart;
    if (windowWidth <= 0) return;

    const targetScaleX = width / (xScale(clampedEnd) - xScale(windowStart));
    const targetTranslateX = -xScale(windowStart) * targetScaleX + leftPadding;

    animateZoom(
      {
        scaleX: zoom.transformMatrix.scaleX,
        translateX: zoom.transformMatrix.translateX,
      },
      {
        scaleX: targetScaleX,
        translateX: targetTranslateX,
      },
      (state) => {
        zoom.setTransformMatrix({
          ...zoom.transformMatrix,
          ...state,
        });
      }
    );
  };

  const handleZoomToYearToDate = () => {
    if (!plan?.birth_date || !netWorthData.length) return;

    const currentDateString = daysSinceBirthToDateString(currentDay, plan.birth_date);
    const currentYear = Number(currentDateString.slice(0, 4));
    const startDateString = `${currentYear}-01-01`;
    const endDateString = `${currentYear + 1}-01-01`;

    const windowStartRaw = dateStringToDaysSinceBirth(startDateString, plan.birth_date);
    const windowEndRaw = dateStringToDaysSinceBirth(endDateString, plan.birth_date);
    const maxDate = Math.max(...netWorthData.map(d => d.date));

    const windowStart = Math.max(0, windowStartRaw);
    const windowEnd = Math.min(windowEndRaw, maxDate) + ytdPaddingDays;
    const windowWidth = windowEnd - windowStart;
    if (windowWidth <= 0) return;

    const targetScaleX = width / (xScale(windowEnd) - xScale(windowStart));
    const targetTranslateX = -xScale(windowStart) * targetScaleX + ytdTranslatePad;

    animateZoom(
      {
        scaleX: zoom.transformMatrix.scaleX,
        translateX: zoom.transformMatrix.translateX,
      },
      {
        scaleX: targetScaleX,
        translateX: targetTranslateX,
      },
      (state) => {
        zoom.setTransformMatrix({
          ...zoom.transformMatrix,
          ...state,
        });
      }
    );
  };

  const handleZoomToMonthToDate = () => {
    if (!plan?.birth_date || !netWorthData.length) return;

    const currentDateString = daysSinceBirthToDateString(currentDay, plan.birth_date);
    const currentYear = Number(currentDateString.slice(0, 4));
    const currentMonth = Number(currentDateString.slice(5, 7));
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const startDateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDateString = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const windowStartRaw = dateStringToDaysSinceBirth(startDateString, plan.birth_date);
    const windowEndRaw = dateStringToDaysSinceBirth(endDateString, plan.birth_date);
    const maxDate = Math.max(...netWorthData.map(d => d.date));

    const windowStart = Math.max(0, windowStartRaw);
    const windowEnd = Math.min(windowEndRaw, maxDate) + mtdPaddingDays;
    const windowWidth = windowEnd - windowStart;
    if (windowWidth <= 0) return;

    const targetScaleX = width / (xScale(windowEnd) - xScale(windowStart));
    const targetTranslateX = -xScale(windowStart) * targetScaleX + mtdTranslatePad;

    animateZoom(
      {
        scaleX: zoom.transformMatrix.scaleX,
        translateX: zoom.transformMatrix.translateX,
      },
      {
        scaleX: targetScaleX,
        translateX: targetTranslateX,
      },
      (state) => {
        zoom.setTransformMatrix({
          ...zoom.transformMatrix,
          ...state,
        });
      }
    );
  };

  return {
    handleZoomToWindow,
    handleZoomToYearToDate,
    handleZoomToMonthToDate,
  };
};
