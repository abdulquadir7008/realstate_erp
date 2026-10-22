-- Prevent duplicate payments for the same gateway transaction per tenant/gateway.
CREATE UNIQUE INDEX "Payment_organizationId_gateway_gatewayPaymentId_key"
ON "Payment"("organizationId", "gateway", "gatewayPaymentId");
