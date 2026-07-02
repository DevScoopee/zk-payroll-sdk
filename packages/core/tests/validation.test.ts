import { PayrollValidation } from "../src/core/validation";
import { ValidationError } from "../src/core/errors";
import { PaymentParams } from "../src/types";

describe("PayrollValidation", () => {
  const validParams: PaymentParams = {
    recipient: "GBXYZ...",
    amount: 10000000n,
    asset: "native",
  };

  it("should validate correct parameters", () => {
    const result = PayrollValidation.validatePaymentParams(validParams);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);

    expect(() => PayrollValidation.assertValidPaymentParams(validParams)).not.toThrow();
  });

  it("should detect missing recipient", () => {
    const params = { ...validParams, recipient: "" };
    const result = PayrollValidation.validatePaymentParams(params);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: "recipient" }));

    expect(() => PayrollValidation.assertValidPaymentParams(params)).toThrow(ValidationError);
  });

  it("should detect invalid amount", () => {
    const params = { ...validParams, amount: 0n };
    const result = PayrollValidation.validatePaymentParams(params);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: "amount" }));
  });

  it("should detect missing asset", () => {
    const params = { ...validParams, asset: "  " };
    const result = PayrollValidation.validatePaymentParams(params);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: "asset" }));
  });
});
