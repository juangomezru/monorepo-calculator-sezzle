type CalculationTrailProps = {
  trail: string;
};

export function CalculationTrail({ trail }: CalculationTrailProps) {
  if (!trail) return null;

  return (
    <section className="calculation-trail" aria-label="Calculation trail">
      <span className="trail-expression">{trail}</span>
    </section>
  );
}
