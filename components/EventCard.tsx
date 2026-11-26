import type { Card } from '@/content/itinerary';
import { mapUrl } from '@/lib/itinerary';
import { formatClock } from '@/lib/time';
import { Tag } from './Tag';

type Props = { card: Card; number: number; now?: boolean };

function TimeColumn({ card }: { card: Card }) {
  if (!card.start) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[34px] leading-none font-bold font-stretch-condensed text-highlight">TBD</p>
        {card.timeHint && <p className="text-xs text-muted">{card.timeHint}</p>}
      </div>
    );
  }
  const start = formatClock(card.start);
  const end = card.end ? formatClock(card.end) : null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[34px] leading-none font-bold font-stretch-condensed text-highlight">{start.clock}</p>
      <p className="text-xs text-muted">
        {end ? `to ${card.endApprox ? '~' : ''}${end.clock} ${end.period}` : start.period}
      </p>
    </div>
  );
}

function Place({ card }: { card: Card }) {
  const text = card.place ?? card.address;
  if (!text) return null;
  if (!card.address) return <p className="text-sm text-body">{text}</p>;
  return (
    <a href={mapUrl(card.address)} target="_blank" rel="noopener noreferrer" className="text-sm text-link">
      {text}
    </a>
  );
}

// Shows only the fields that are filled in.
export function EventCard({ card, number, now = false }: Props) {
  const details = [card.arriveEarly, card.gettingThere && `Getting there: ${card.gettingThere}`, card.bring && `Bring: ${card.bring}`].filter(
    Boolean,
  ) as string[];

  return (
    <article
      className={`grid grid-cols-[84px_minmax(0,1fr)] gap-4 rounded-xl bg-card ${now ? 'border-2 border-highlight p-4' : 'p-[18px]'}`}
    >
      <TimeColumn card={card} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <p className={`font-mono text-xs font-medium ${card.label ? 'text-highlight' : 'text-muted'}`}>
            {String(number).padStart(2, '0')}
            {card.label && ` · ${card.label}`}
          </p>
          {now && <Tag>Now</Tag>}
        </div>
        <h3 className="text-xl font-semibold text-text">{card.title}</h3>
        <Place card={card} />
        {card.description && <p className="text-[15px] leading-normal text-body">{card.description}</p>}
        {details.map((line) => (
          <p key={line} className="text-[15px] leading-normal text-body">
            {line}
          </p>
        ))}
        {card.notes && card.notes.length > 0 && (
          <ul className="list-disc pl-4 text-[13px] text-muted">
            {card.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {card.cost && <p className="text-[13px] text-muted">{card.cost} (estimate)</p>}
      </div>
    </article>
  );
}
