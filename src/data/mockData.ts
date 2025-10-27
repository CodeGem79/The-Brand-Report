export interface Update {
  id: string;
  date: string;
  title: string;
  content: string;
}

export interface Comment {
  id: string;
  author: string;
  date: string;
  content: string;
  isClaimant?: boolean;
}

// [MODERATION FEATURE] New interface for reported public comments
export interface ReportedComment {
  id: string;
  petitionId: string;
  commentId: string;
  reporterName: string;
  reason: string;
  reportedAt: string;
  status: 'new' | 'reviewed' | 'action_taken';
}

export interface Petition {
  id: string;
  brand: string;
  title: string;
  description: string;
  supporters: number;
  status: 'active' | 'investigating' | 'resolved';
  createdAt: string;
  blogContent: string;
  updates: Update[];
  // 🛑 SCALABILITY FIX: The 'comments' array has been removed.
}

export const mockPetitions: Petition[] = [
  {
    id: '1',
    brand: 'TechGiant Inc.',
    title: 'The 14-Day Refund: A Brand Wrong',
    description: 'Multiple consumers report systematic denial of legitimate 14-day refund requests, citing fabricated policy violations.',
    supporters: 847,
    status: 'investigating',
    createdAt: '2025-01-15',
    blogContent: `## Investigation Overview

Over the past three months, we've received 847 reports from consumers experiencing identical issues with TechGiant Inc.'s refund process. Despite clear adherence to the advertised 14-day money-back guarantee, customers are being systematically denied refunds through what appears to be a coordinated pattern of policy misinterpretation.

## The Pattern

1. **Initial Purchase**: Customers purchase products with clear 14-day guarantee
2. **Refund Request**: Within the 14-day window, refund requested
3. **False Rejection**: Company claims "policy violation" or "terms not met"
4. **Customer Service Loop**: Multiple escalations lead nowhere

## Evidence Collected

We have documented over 200 individual cases with timestamped evidence showing:
- Purchase confirmations
- Timely refund requests
- Contradictory company responses
- Financial impact on consumers

## What We're Demanding

1. Immediate processing of all legitimate pending refunds
2. Public acknowledgment of the issue
3. Policy clarification and transparency
4. Compensation for affected customers

The Brand Report will continue monitoring this situation and updating supporters as developments occur.`,
    updates: [
      {
        id: 'u1',
        date: '2025-02-10',
        title: 'Media Coverage Achieved',
        content: 'Major consumer rights publication picked up the story. Company PR department has acknowledged receipt of our concerns.'
      },
      {
        id: 'u2',
        date: '2025-01-28',
        title: 'Supporter Milestone: 500',
        content: 'Reached 500 supporters. Company has been officially notified of our investigation.'
      },
      {
        id: 'u3',
        date: '2025-01-15',
        title: 'Investigation Opened',
        content: 'TechGiant Inc. has been placed under formal observation. Evidence collection phase initiated.'
      }
    ],
    // 🛑 SCALABILITY FIX: 'comments' array removed
  },
  {
    id: '2',
    brand: 'FastShip Logistics',
    title: 'Hidden Subscription Charges',
    description: 'Consumers discovering unauthorized recurring charges months after one-time purchase, buried in checkout process.',
    supporters: 1203,
    status: 'active',
    createdAt: '2024-12-20',
    blogContent: `## The Hidden Subscription Trap

FastShip Logistics has been enrolling customers in a "Premium Membership" program without clear consent during checkout. What appears to be a one-time shipping fee is actually the first payment in a recurring monthly subscription.

## How It Works

The company uses a pre-checked box (in small print) during checkout that most customers don't notice. This box enrolls them in a $19.99/month membership that provides minimal value.

## Investigation Status

We are currently gathering evidence and working with affected consumers to document the full scope of this practice. Our legal team is reviewing whether this constitutes deceptive trade practices.`,
    updates: [
      {
        id: 'u4',
        date: '2025-02-01',
        title: 'Over 1,000 Supporters',
        content: 'Investigation gaining momentum. Multiple state attorney general offices have been contacted.'
      }
    ],
    // 🛑 SCALABILITY FIX: 'comments' array removed
  },
  {
    id: '3',
    brand: 'HomeComfort Co.',
    title: 'Warranty Claim Denials',
    description: 'Pattern of denying valid warranty claims on defective products, claiming "user error" without proper investigation.',
    supporters: 562,
    status: 'active',
    createdAt: '2025-02-01',
    blogContent: `## Systematic Warranty Failures

HomeComfort Co. advertises "comprehensive 2-year warranties" on all products, but our investigation reveals a troubling pattern of claim denials.

## The Issue

Consumers reporting legitimate product defects are being told their warranty is void due to "user error" or "improper maintenance" without any actual investigation or evidence. The company appears to be using these blanket denials to avoid honoring warranty obligations.

## Current Status

We're collecting documentation from affected consumers and reviewing the warranty terms against the company's actual practices.`,
    updates: [],
    // 🛑 SCALABILITY FIX: 'comments' array removed
  }
];

export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  featured: boolean;
  image: string;
}

export const mockBlogArticles: BlogArticle[] = [
  {
    id: "blog-1",
    title: "Understanding Your Consumer Rights: The Basics",
    excerpt: "Every consumer has fundamental rights. Learn what protections you're entitled to and how to enforce them when companies fail to deliver.",
    content: `# Understanding Your Consumer Rights: The Basics

Every consumer has fundamental rights that are protected by law. Whether you're purchasing a product online, signing up for a service, or dealing with a faulty item, understanding these rights is crucial.

## Your Core Rights

1. **The Right to Safety**: Products and services should not pose harm to consumers.
2. **The Right to Be Informed**: Companies must provide accurate information about their products.
3. **The Right to Choose**: Consumers should have access to competitive markets.
4. **The Right to Be Heard**: Your complaints and concerns should be addressed.

## When Things Go Wrong

If a company violates your consumer rights, document everything. Keep receipts, emails, and records of all communications. This documentation becomes crucial if you need to escalate your complaint.

## Taking Action

Start with the company's customer service, but don't stop there if you're not satisfied. Consumer protection agencies exist to help you enforce your rights.`,
    author: "The Brand Report Team",
    publishedAt: "2024-01-25",
    category: "Consumer Education",
    featured: true,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop"
  },
  {
    id: "blog-2",
    title: "Red Flags: How to Spot Deceptive Return Policies",
    excerpt: "Learn to identify the warning signs of problematic return policies before making a purchase. Knowledge is your best defense.",
    content: `# Red Flags: How to Spot Deceptive Return Policies

Before clicking 'buy,' take a moment to review the return policy. Here are the red flags that should make you think twice.

## Warning Signs

- **Vague Language**: Terms like "reasonable condition" or "at our discretion" give companies too much wiggle room
- **Hidden Fees**: Restocking fees or return shipping costs buried in fine print
- **Short Windows**: Return periods shorter than 14 days are often unreasonable
- **Complex Procedures**: Requiring original packaging, receipts, and multiple forms

## What Good Policies Look Like

Transparent companies make returns easy. Look for clear time frames, straightforward processes, and no surprise fees.`,
    author: "The Brand Report Team",
    publishedAt: "2024-01-20",
    category: "Consumer Tips",
    featured: false,
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop"
  },
  {
    id: "blog-3",
    title: "The Hidden Cost of Free Trials",
    excerpt: "Free trials aren't always free. Discover the tactics companies use to trap consumers in expensive subscriptions.",
    content: `# The Hidden Cost of Free Trials

That "free trial" might cost you more than you think. Here's what you need to know before signing up.

## Common Tactics

Companies often make it easy to sign up but difficult to cancel. They count on consumer forgetfulness and complicated cancellation processes.

## Protect Yourself

- Set calendar reminders before the trial ends
- Use virtual credit cards that you can easily cancel
- Screenshot the cancellation policy
- Document your cancellation attempts

## When to Walk Away

If a company requires a phone call to cancel, that's a red flag. Legitimate services make cancellation as easy as signup.`,
    author: "The Brand Report Team",
    publishedAt: "2024-01-15",
    category: "Investigations",
    featured: false,
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&auto=format&fit=crop"
  }
];