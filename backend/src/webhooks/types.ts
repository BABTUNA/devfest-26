/**
 * Flowglad webhook event types
 */

export interface WebhookEvent {
  id: string;
  type: string;
  object: string;
}

export interface CustomerInfo {
  id: string;
  externalId: string;
}

export interface PaymentFailedEvent extends WebhookEvent {
  type: 'payment.failed';
  object: 'payment';
  customer: CustomerInfo;
  failureReason?: string;
}

export interface PaymentSucceededEvent extends WebhookEvent {
  type: 'payment.succeeded';
  object: 'payment';
  customer: CustomerInfo;
}

export interface SubscriptionCreatedEvent extends WebhookEvent {
  type: 'subscription.created';
  object: 'subscription';
  customer: CustomerInfo;
}

export interface SubscriptionUpdatedEvent extends WebhookEvent {
  type: 'subscription.updated';
  object: 'subscription';
  customer: CustomerInfo;
}

export interface SubscriptionCanceledEvent extends WebhookEvent {
  type: 'subscription.canceled';
  object: 'subscription';
  customer: CustomerInfo;
}

export interface CustomerCreatedEvent extends WebhookEvent {
  type: 'customer.created';
  object: 'customer';
  customer: CustomerInfo;
}

export interface CustomerUpdatedEvent extends WebhookEvent {
  type: 'customer.updated';
  object: 'customer';
  customer: CustomerInfo;
}

export interface PurchaseCompletedEvent extends WebhookEvent {
  type: 'purchase.completed';
  object: 'purchase';
  customer: CustomerInfo;
}

export type FlowgladWebhookEvent =
  | PaymentFailedEvent
  | PaymentSucceededEvent
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent
  | CustomerCreatedEvent
  | CustomerUpdatedEvent
  | PurchaseCompletedEvent;
