/**
 * FlowAtGenAi - Connector Registry
 * 
 * Central export of all available connectors.
 * Total: 33 Built-in Connectors
 * 
 * @module connectors
 */

// Communication
export { default as slackConnector } from './slack';
export { default as discordConnector } from './discord';
export { default as twilioConnector } from './twilio';
export { default as telegramConnector } from './telegram';
export { default as teamsConnector } from './microsoft-teams';

// CRM & Sales
export { default as hubspotConnector } from './hubspot';
export { default as salesforceConnector } from './salesforce';

// Database
export { default as postgresConnector } from './postgres';
export { default as mongodbConnector } from './mongodb';
export { default as airtableConnector } from './airtable';
export { default as supabaseConnector } from './supabase';

// Storage
export { default as googleDriveConnector } from './google-drive';
export { default as awsS3Connector } from './aws-s3';

// Productivity
export { default as notionConnector } from './notion';
export { default as jiraConnector } from './jira';
export { default as asanaConnector } from './asana';
export { default as linearConnector } from './linear';
export { default as calendlyConnector } from './calendly';
export { default as typeformConnector } from './typeform';
export { default as googleSheetsConnector } from './google-sheets';

// AI & ML
export { default as openaiConnector } from './openai';
export { default as anthropicConnector } from './anthropic';

// Payment
export { default as stripeConnector } from './stripe';
export { default as quickbooksConnector } from './quickbooks';

// Developer
export { default as githubConnector } from './github';
export { default as httpConnector } from './http';

// Marketing
export { default as mailchimpConnector } from './mailchimp';

// E-commerce
export { default as shopifyConnector } from './shopify';

// Support
export { default as zendeskConnector } from './zendesk';
export { default as intercomConnector } from './intercom';

// Video & Meetings
export { default as zoomConnector } from './zoom';

// Analytics
export { default as segmentConnector } from './segment';

// DevOps
export { default as pagerdutyConnector } from './pagerduty';

// Connector registry for runtime access
export const connectorRegistry = {
  // Add all connectors here
};
