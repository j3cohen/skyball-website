// Refund policy shown on paid tournament/event info.
export default function RefundPolicyNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-gray-500 leading-relaxed ${className}`}>
      <span className="font-medium">Refund policy:</span> Withdraw more than 48 hours before the
      event for a refund of your entry fee, less a 10% service fee. Within 48 hours of the event,
      entry fees are non-refundable — email{" "}
      <a href="mailto:info@skyball.us" className="underline">
        info@skyball.us
      </a>{" "}
      to request a credit toward a future tournament.
    </p>
  )
}
