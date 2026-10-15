import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UtilityRequestNotificationDialog from "./UtilityRequestNotificationDialog";
import type { UtilityRequest } from "@/lib/utilityServices";

const request: UtilityRequest = {
  id: "booking-123", service_id: "service-123", customer_user_id: null,
  contact_name: "Sample customer", contact_phone: "9000000000", address: "Sample address",
  preferred_date: null, notes: null, status: "pending", admin_notes: null,
  quoted_amount: null, created_at: "2026-10-07T07:00:00Z",
  variant_label: "Family pack", quantity: 2, total_amount: 500, latitude: 10, longitude: 76,
};

describe("UtilityRequestNotificationDialog", () => {
  it("shows only pending bookings in the shared blue frame and preserves actions", () => {
    const onAccept = vi.fn();
    const onOpenChange = vi.fn();
    render(<UtilityRequestNotificationDialog open onOpenChange={onOpenChange} requests={[request, { ...request, id: "done", status: "completed", contact_name: "Completed customer" }]} serviceName={() => "Sample service"} onAccept={onAccept} onRemindLater={() => onOpenChange(false)} />);
    expect(screen.getByRole("dialog")).toHaveClass("delivery-blue");
    expect(screen.getByText("1 new · awaiting action")).toBeInTheDocument();
    expect(screen.getByText("Sample customer")).toBeInTheDocument();
    expect(screen.queryByText("Completed customer")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open location on map" })).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=10,76");
    fireEvent.click(screen.getByRole("button", { name: "Accept request" }));
    expect(onAccept).toHaveBeenCalledWith(request.id);
    fireEvent.click(screen.getByRole("button", { name: "Not today" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });
});