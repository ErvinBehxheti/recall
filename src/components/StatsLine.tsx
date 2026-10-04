type Props = { minutes: number; pages: number; questions: number };

export function StatsLine({ minutes, pages, questions }: Props) {
  return <p className="text-[1.125rem] text-ink-soft">{`${pages} pages, ${questions} questions, about ${minutes} minutes`}</p>;
}
