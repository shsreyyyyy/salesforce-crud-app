

module.exports = {
  Account: {
    label: "Account",
    fields: ["Name", "Industry", "Phone", "Website", "AnnualRevenue", "BillingCity", "Type"],
    requiredOnCreate: ["Name"],
  },
  Contact: {
    label: "Contact",
    fields: ["FirstName", "LastName", "Email", "Phone", "Title", "Department", "MailingCity"],
    requiredOnCreate: ["LastName"],
  },
  Lead: {
    label: "Lead",
    fields: ["FirstName", "LastName", "Company", "Email", "Phone", "Status", "LeadSource", "Industry"],
    requiredOnCreate: ["LastName", "Company"],
  },
  Opportunity: {
    label: "Opportunity",
    fields: ["Name", "StageName", "Amount", "CloseDate", "Probability", "Type", "LeadSource"],
    requiredOnCreate: ["Name", "StageName", "CloseDate"],
  },
  Case: {
    label: "Case",
    fields: ["Subject", "Status", "Priority", "Origin", "Description", "Type"],
    requiredOnCreate: [],
  },
};
