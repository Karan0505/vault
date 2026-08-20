import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { addressUpdateSchema } from "@/lib/validation/validation";
import {
  updateCustomerAddress,
  deleteCustomerAddress,
  AddressNotFoundError,
} from "@/lib/account/addresses.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = addressUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const address = await updateCustomerAddress(userId, id, parsed.data);
    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof AddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to update address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteCustomerAddress(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to delete address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
