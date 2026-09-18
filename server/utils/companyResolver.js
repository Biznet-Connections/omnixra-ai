import User from "../models/User.js";
import Company from "../models/Company.js";

/**
 * Resolve how to contact a company.
 * Returns:
 *   { type: "user", userId }  — company is registered, use DM
 *   { type: "email", email }  — send via Resend
 *   { type: "none" }          — no email, no user
 */
export async function resolveCompanyTarget({ companyId, companyName }) {
  try {
    let company = null;

    if (companyId) {
      company = await Company.findById(companyId).lean();
    }
    if (!company && companyName) {
      company = await Company.findOne({ name: companyName }).lean();
    }

    // 1. Check if there's a registered User with accountType=company and matching email
    if (company?.email) {
      const user = await User.findOne({ email: company.email, accountType: "company" }).select("_id").lean();
      if (user) {
        return { type: "user", userId: user._id, company };
      }
    }

    // 2. Check by companyName as fallback
    if (companyName) {
      const user = await User.findOne({ companyName, accountType: "company" }).select("_id").lean();
      if (user) {
        return { type: "user", userId: user._id, company };
      }
    }

    // 3. Fall back to email
    if (company?.email) {
      return { type: "email", email: company.email, company };
    }

    return { type: "none", company };
  } catch (e) {
    console.error("[companyResolver] error:", e.message);
    return { type: "none" };
  }
}
