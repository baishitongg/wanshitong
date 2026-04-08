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

export type ServiceMediaType = "image" | "video";

export type ServiceMediaItem = {
  url: string;
  type: ServiceMediaType;
};

export type ServicePackageOption = {
  price: number;
  durationMinutes: number;
};

export type ServiceAttributes = {
  galleryMedia: ServiceMediaItem[];
  galleryUrls: string[];
  packageOptions: ServicePackageOption[];
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

function normalizeServicePackageOption(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const rawPrice = typeof value.price === "number" ? value.price : Number(value.price);
  const rawDuration =
    typeof value.durationMinutes === "number"
      ? value.durationMinutes
      : Number(value.durationMinutes);

  if (!Number.isFinite(rawPrice) || rawPrice < 0 || !Number.isFinite(rawDuration) || rawDuration <= 0) {
    return null;
  }

  return {
    price: Number(rawPrice.toFixed(2)),
    durationMinutes: Math.round(rawDuration),
  } satisfies ServicePackageOption;
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

export function inferServiceMediaType(url: string) {
  const normalizedUrl = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp4|webm|mov|m4v|ogv|ogg)$/i.test(normalizedUrl) ? "video" : "image";
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
  const rawMedia = Array.isArray(safeAttributes?.galleryMedia) ? safeAttributes.galleryMedia : [];
  const parsedMedia = rawMedia
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const url = typeof entry.url === "string" ? entry.url.trim() : "";
      if (!url) {
        return null;
      }

      return {
        url,
        type: entry.type === "video" ? "video" : "image",
      } satisfies ServiceMediaItem;
    })
    .filter((entry): entry is ServiceMediaItem => entry !== null);

  const existingMediaUrls = new Set(parsedMedia.map((entry) => entry.url));
  const legacyImageMedia = galleryUrls
    .filter((url) => !existingMediaUrls.has(url))
    .map((url) => ({
      url,
      type: "image" as const,
    }));
  const galleryMedia = [...parsedMedia, ...legacyImageMedia];
  const rawPackageOptions = Array.isArray(safeAttributes?.packageOptions)
    ? safeAttributes.packageOptions
    : [];
  const packageOptions = rawPackageOptions
    .map((entry) => normalizeServicePackageOption(entry))
    .filter((entry): entry is ServicePackageOption => entry !== null);

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
    galleryMedia,
    galleryUrls: galleryMedia
      .filter((item) => item.type === "image")
      .map((item) => item.url),
    packageOptions,
    weeklyAvailability: mappedAvailability,
  };
}

export function buildServiceAttributes(input: ServiceAttributes) {
  const galleryMedia = input.galleryMedia
    .map((item) => ({
      url: item.url.trim(),
      type: item.type,
    }))
    .filter((item) => item.url.length > 0);
  const packageOptions = input.packageOptions
    .map((item) => normalizeServicePackageOption(item))
    .filter((item): item is ServicePackageOption => item !== null);

  return {
    galleryMedia,
    galleryUrls: galleryMedia
      .filter((item) => item.type === "image")
      .map((item) => item.url),
    packageOptions,
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

export function formatServiceDuration(durationMinutes: number) {
  if (durationMinutes < 60) {
    return `${durationMinutes} 分钟`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
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
