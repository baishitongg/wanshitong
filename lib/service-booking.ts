export type ServiceWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ServiceTimeRange = {
  start: string;
  end: string;
};

export type ServiceAvailabilityDay = {
  day: ServiceWeekday;
  enabled: boolean;
  slots: ServiceTimeRange[];
};

export type ServiceAttributes = {
  galleryUrls: string[];
  weeklyAvailability: ServiceAvailabilityDay[];
};

export type ServiceSlot = {
  key: string;
  date: string;
  start: string;
  end: string;
  label: string;
};

const WEEK_DAYS: ServiceWeekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const WEEKDAY_LABELS: Record<ServiceWeekday, string> = {
  MONDAY: "星期一",
  TUESDAY: "星期二",
  WEDNESDAY: "星期三",
  THURSDAY: "星期四",
  FRIDAY: "星期五",
  SATURDAY: "星期六",
  SUNDAY: "星期日",
};

function toServiceWeekday(date: Date): ServiceWeekday {
  const day = date.getDay();
  return WEEK_DAYS[(day + 6) % 7];
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function buildDefaultAvailability(): ServiceAvailabilityDay[] {
  return WEEK_DAYS.map((day) => ({
    day,
    enabled: false,
    slots: [],
  }));
}

export function isServiceProduct(product: {
  itemType?: string | null;
  requiresScheduling?: boolean | null;
  fulfillmentType?: string | null;
}) {
  return (
    product.itemType === "SERVICE" ||
    product.requiresScheduling === true ||
    product.fulfillmentType === "BOOKING"
  );
}

export function normalizeServiceAttributes(attributes: unknown): ServiceAttributes {
  const safeAttributes =
    typeof attributes === "object" && attributes !== null
      ? (attributes as Record<string, unknown>)
      : null;
  const rawGallery = Array.isArray(safeAttributes?.galleryUrls)
    ? safeAttributes?.galleryUrls
    : [];
  const galleryUrls = rawGallery.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  const defaultAvailability = buildDefaultAvailability();
  const rawAvailability = Array.isArray(safeAttributes?.weeklyAvailability)
    ? safeAttributes?.weeklyAvailability
    : [];

  const mappedAvailability = defaultAvailability.map((defaultDay) => {
    const matched = rawAvailability.find(
      (entry): entry is {
        day?: unknown;
        enabled?: unknown;
        slots?: unknown;
      } =>
        typeof entry === "object" &&
        entry !== null &&
        "day" in entry &&
        entry.day === defaultDay.day,
    );

    if (!matched) {
      return defaultDay;
    }

    const slots = Array.isArray(matched.slots)
      ? matched.slots.filter(
          (slot): slot is ServiceTimeRange =>
            typeof slot === "object" &&
            slot !== null &&
            "start" in slot &&
            "end" in slot &&
            typeof slot.start === "string" &&
            typeof slot.end === "string",
        )
      : [];

    return {
      day: defaultDay.day,
      enabled: matched.enabled === true && slots.length > 0,
      slots,
    };
  });

  return {
    galleryUrls,
    weeklyAvailability: mappedAvailability,
  };
}

export function buildServiceAttributes(input: ServiceAttributes) {
  return {
    galleryUrls: input.galleryUrls.filter((value) => value.trim().length > 0),
    weeklyAvailability: input.weeklyAvailability.map((day) => ({
      day: day.day,
      enabled: day.enabled && day.slots.length > 0,
      slots: day.slots
        .map((slot) => ({
          start: slot.start,
          end: slot.end,
        }))
        .filter((slot) => slot.start && slot.end),
    })),
  };
}

export function formatServiceSlotLabel(start: Date, end: Date) {
  const weekday = WEEKDAY_LABELS[toServiceWeekday(start)];
  const dateLabel = start.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
  const timeLabel = `${start.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} - ${end.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;

  return `${weekday} ${dateLabel} ${timeLabel}`;
}

export function buildUpcomingServiceSlots(input: {
  attributes: unknown;
  durationMinutes?: number | null;
  minAdvanceHours?: number | null;
  maxAdvanceDays?: number | null;
  bookedSlots?: Array<{
    scheduledStart?: Date | string | null;
    scheduledEnd?: Date | string | null;
  }>;
  now?: Date;
}) {
  const { weeklyAvailability } = normalizeServiceAttributes(input.attributes);
  const now = input.now ?? new Date();
  const leadTime = new Date(
    now.getTime() + Math.max(input.minAdvanceHours ?? 0, 0) * 60 * 60 * 1000,
  );
  const maxDays = Math.max(input.maxAdvanceDays ?? 14, 1);
  const bookedKeys = new Set(
    (input.bookedSlots ?? [])
      .map((slot) => {
        if (!slot.scheduledStart || !slot.scheduledEnd) return null;
        const start = new Date(slot.scheduledStart);
        const end = new Date(slot.scheduledEnd);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }
        return `${start.toISOString()}|${end.toISOString()}`;
      })
      .filter((value): value is string => Boolean(value)),
  );

  const result: ServiceSlot[] = [];

  for (let offset = 0; offset < maxDays; offset += 1) {
    const dayDate = new Date(now);
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() + offset);

    const weekday = toServiceWeekday(dayDate);
    const availability = weeklyAvailability.find((day) => day.day === weekday);

    if (!availability?.enabled) {
      continue;
    }

    for (const slot of availability.slots) {
      const startParts = parseTime(slot.start);
      const endParts = parseTime(slot.end);

      if (!startParts || !endParts) {
        continue;
      }

      const start = new Date(dayDate);
      start.setHours(startParts.hours, startParts.minutes, 0, 0);

      const rangeEnd = new Date(dayDate);
      rangeEnd.setHours(endParts.hours, endParts.minutes, 0, 0);

      // Support overnight availability like 12:00 -> 01:00.
      if (rangeEnd <= start) {
        rangeEnd.setDate(rangeEnd.getDate() + 1);
      }
      const durationMinutes =
        input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : null;

      if (!durationMinutes) {
        if (start < leadTime) {
          continue;
        }

        const key = `${start.toISOString()}|${rangeEnd.toISOString()}`;
        if (bookedKeys.has(key)) {
          continue;
        }

        result.push({
          key,
          date: start.toISOString().slice(0, 10),
          start: start.toISOString(),
          end: rangeEnd.toISOString(),
          label: formatServiceSlotLabel(start, rangeEnd),
        });
        continue;
      }

      let cursor = new Date(start);
      while (cursor < rangeEnd) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

        if (slotEnd > rangeEnd) {
          break;
        }

        if (slotStart >= leadTime) {
          const key = `${slotStart.toISOString()}|${slotEnd.toISOString()}`;
          if (!bookedKeys.has(key)) {
            result.push({
              key,
              date: slotStart.toISOString().slice(0, 10),
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              label: formatServiceSlotLabel(slotStart, slotEnd),
            });
          }
        }

        cursor = slotEnd;
      }
    }
  }

  return result;
}
