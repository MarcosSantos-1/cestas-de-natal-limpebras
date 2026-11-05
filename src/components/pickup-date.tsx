"use client";
import { Button } from "@heroui/react/button";
import { Popover } from "@heroui/react/popover";
import { useState } from "react";
import { Calendar } from "@heroui/react/calendar";
import { parseDate } from "@internationalized/date";
import { formatDay, todayBrazil } from "@/lib/domain";
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
  const [open, setOpen] = useState(false);
  const minimum = parseDate(todayBrazil());

  return (
    <div className="pickup-picker">
      <span className="label">Data da retirada</span>
      <Popover isOpen={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="outline"
          className="pickup-date-trigger"
          aria-label={
            value
              ? `Data da retirada: ${formatDay(value)}`
              : "Escolher data da retirada"
          }
          isDisabled={busy}
        >
          <span>{value ? formatDay(value) : "Escolher data"}</span>
          <CalendarDays size={21} />
        </Button>
        <Popover.Content className="calendar-popover">
          <Popover.Dialog aria-label="Escolher data da retirada">
            <Calendar
              aria-label="Data da retirada"
              value={value ? parseDate(value) : null}
              minValue={minimum}
              defaultFocusedValue={value ? parseDate(value) : minimum}
              onChange={(date) => {
                onChange(date.toString());
                setOpen(false);
              }}
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
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
