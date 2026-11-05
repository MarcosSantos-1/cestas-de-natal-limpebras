"use client";
import { DatePicker } from "@heroui/react/date-picker";
import { DateField } from "@heroui/react/date-field";
import { Calendar } from "@heroui/react/calendar";
import { Label } from "@heroui/react/label";
import { FieldError } from "@heroui/react/field-error";
import { parseDate } from "@internationalized/date";
import { todayBrazil } from "@/lib/domain";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
export default function PickupDate({
  value,
  onChange,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
}) {
  return (
    <DatePicker
      className="pickup-picker"
      value={value ? parseDate(value) : null}
      onChange={(v) => onChange(v?.toString() || "")}
      minValue={parseDate(todayBrazil())}
      isRequired
      isDisabled={busy}
      shouldForceLeadingZeros
    >
      <Label>Data da retirada</Label>
      <DateField.Group>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label="Abrir calendário">
            <CalendarDays size={21} />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <FieldError />
      <DatePicker.Popover className="calendar-popover">
        <Calendar
          aria-label="Data da retirada"
          defaultFocusedValue={parseDate(todayBrazil())}
        >
          <Calendar.Header>
            <Calendar.NavButton slot="previous" aria-label="Mês anterior">
              <ChevronLeft size={19} />
            </Calendar.NavButton>
            <Calendar.Heading />
            <Calendar.NavButton slot="next" aria-label="Próximo mês">
              <ChevronRight size={19} />
            </Calendar.NavButton>
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
