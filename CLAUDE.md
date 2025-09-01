# AI Meal Planner - Project Documentation

## IMPORTANT: Development Environment Constraints

**PACKAGE MANAGER**: This project uses pnpm. Always use pnpm commands (not npm or yarn).

## Project Overview

A web application that uses generative AI to help users create personalized meal plans based on their health data. This is an MVP focused on core functionality.

## Core Features

### MVP Features (Simplified)

- **Health Profile Setup**: Age, weight, height, basic dietary restrictions (vegetarian, gluten-free only)
- **AI Meal Generation**: Generate 3-day meal plans (breakfast, lunch, dinner only)
- **Meal Display**: Simple cards showing meals with ingredients
- **Chat Interface**: Basic meal refinement ("make this lighter", "I don't like X")
- **Plan Regeneration**: Regenerate entire meal plan only
- **Basic Grocery List**: Generated from meal plan

### User Flow (Simplified)

1. Simple onboarding form (2 screens max)
2. Generate initial 3-day meal plan
3. **Basic chat** to refine meals ("Make this lighter", "I don't like salmon")
4. Regenerate entire plan if needed
5. View final meal plan + grocery list

### Health Data Inputs (Minimal)

- Basic demographics (age, gender, activity level)
- Dietary restrictions (vegetarian, gluten-free only)
- Simple goals (weight loss, maintenance, muscle gain)
- Basic food dislikes (free text)

## Technology Stack

### Frontend

- **Framework**: Next.js 15 with TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand (lightweight) or React Query (server state)
- **Date Handling**: date-fns
- **Chat**: @ai-sdk/core (Vercel AI SDK) for streaming
- **Markdown**: React Markdown for AI response formatting
- **Notifications**: React Hot Toast for success/error messages

### Backend & Azure Services

- **Hosting**: Azure Static Web Apps (frontend + API)
- **Database**: Azure Cosmos DB (NoSQL) with indexing on userId, mealPlanId
- **API**: Next.js API Routes deployed as Static Web App APIs
- **Authentication**: Azure AD B2C or Microsoft Entra External ID
- **AI Service**: Azure OpenAI Service (GPT-4o or GPT-4)
- **Secrets**: Azure Key Vault
- **Monitoring**: Azure Application Insights

### Azure Integration Libraries

- **Authentication**: @azure/msal-react
- **Database**: @azure/cosmos (for API routes)
- **HTTP Client**: Native fetch with React Query
- **Static Web Apps**: Built-in API functionality

### Development Tools

- **Package Manager**: pnpm (preferred) or npm
- **Code Quality**: ESLint + Prettier (manual execution)
- **Testing**: Vitest + React Testing Library
- **Type Checking**: TypeScript strict mode
- **Environment Management**: dotenv
- **Infrastructure as Code**: Azure Bicep templates for resource provisioning

## Implementation Roadmap

### Phase 1: Foundation

1. Set up Next.js project with TypeScript
2. Configure development tools (ESLint, Prettier)
3. Install and configure shadcn/ui + required libraries
4. Set up testing framework (Vitest + RTL)
5. Create basic UI components (forms, meal cards, chat interface)
6. Build static pages (landing, onboarding, dashboard)
7. Set up project structure and routing
8. Implement error boundaries and loading states

### Phase 2: Core Features

9. Integrate Azure OpenAI for meal generation
10. Implement user onboarding flow with forms (Zod validation)
11. Build meal plan generation and display
12. Create meal card components with regeneration
13. Add input sanitization and API rate limiting
14. Implement caching strategy for meal plans

### Phase 3: Interactive Features

15. Add chat interface for meal refinement
16. Implement streaming AI responses with error handling
17. Build meal plan modification logic
18. Add grocery list generation
19. Implement comprehensive error handling and logging
20. Add unit and integration tests

### Phase 4: Production Ready

21. Create Azure Bicep templates for infrastructure provisioning
22. Set up GitHub Actions for Static Web App deployment
23. Set up Azure authentication with security headers
24. Configure Cosmos DB for data persistence
25. Implement user profile management
26. Set up CI/CD pipeline with automated testing
27. Configure Application Insights monitoring
28. Implement backup and recovery strategy
29. Deploy to Azure Static Web Apps with staging environment
30. Performance optimization and accessibility audit

## Data Models

### User Profile

```typescript
interface UserProfile {
  id: string
  email: string
  age: number
  gender: "male" | "female" | "other"
  height: number // cm
  weight: number // kg
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active"
  dietaryRestrictions: string[]
  allergies: string[]
  goals: "weight_loss" | "maintenance" | "weight_gain" | "muscle_gain"
  preferences: {
    cuisineTypes: string[]
    dislikedFoods: string[]
    mealComplexity: "simple" | "moderate" | "complex"
  }
}
```

### Meal Plan

```typescript
interface MealPlan {
  id: string
  userId: string
  title: string
  duration: number // days
  meals: Meal[]
  createdAt: Date
  updatedAt: Date
}

interface Meal {
  id: string
  day: number
  type: "breakfast" | "lunch" | "dinner"
  name: string
  description: string
  ingredients: string[]
  estimatedCalories: number
  prepTime: number // minutes
}
```

### Chat Message

```typescript
interface ChatMessage {
  id: string
  userId: string
  mealPlanId: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    actionTaken?: string // 'regenerate_meal', 'modify_plan', etc.
    affectedMeals?: string[]
  }
}
```

### Grocery List

```typescript
interface GroceryList {
  id: string
  userId: string
  mealPlanId: string
  items: GroceryItem[]
  createdAt: Date
  updatedAt: Date
}

interface GroceryItem {
  id: string
  name: string
  quantity: string
  category: "produce" | "protein" | "dairy" | "pantry" | "spices" | "other"
  checked: boolean
}
```

### Validation Schemas

```typescript
// Zod schemas for runtime validation
const UserProfileSchema = z.object({
  age: z.number().min(13).max(120),
  gender: z.enum(["male", "female", "other"]),
  height: z.number().min(100).max(250), // cm
  weight: z.number().min(30).max(300), // kg
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  goals: z.enum(["weight_loss", "maintenance", "weight_gain", "muscle_gain"]),
})

const MealPlanRequestSchema = z.object({
  duration: z.number().min(3).max(3), // Fixed to 3 days for MVP
  userProfile: UserProfileSchema,
})
```

## Environment Variables Needed

```
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT_NAME=

# Azure Cosmos DB
COSMOS_DB_ENDPOINT=
COSMOS_DB_KEY=
COSMOS_DB_DATABASE_NAME=

# Azure Authentication
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Next.js
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=

# Rate Limiting
RATE_LIMIT_RPM=60
RATE_LIMIT_RPD=1000

# Caching
REDIS_CONNECTION_STRING= # Optional for caching
```

## Chat Features Specification

### Chat Capabilities (Simplified)

- **Basic Meal Refinement**: "Make this lighter" or "I don't like salmon"
- **Simple Dietary Adjustments**: "Make it vegetarian" or "Remove gluten"
- **Plan Regeneration**: "Generate a new meal plan"
- **Context Awareness**: AI remembers current meal plan and user preferences

### Chat Implementation (Simplified)

- Basic streaming responses using Vercel AI SDK
- Context-aware conversations that reference current meal plan
- Simple responses that trigger full meal plan regeneration
- Basic chat history for current session only

## Next Steps

1. Start fresh chat session for Phase 1 implementation
2. Reference this document for architecture decisions
3. Update this file as new decisions are made during development

## Security & Production Considerations

### Error Handling Strategy

- **Global Error Boundary**: Catch React component errors
- **API Error Handling**: Standardized error responses with proper HTTP codes
- **User-Friendly Messages**: Convert technical errors to user-readable messages
- **Fallback UI**: Graceful degradation for failed AI requests
- **Retry Logic**: Exponential backoff for transient failures

### Performance & UX

- **Loading States**: Skeleton loaders for all async operations
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Image Optimization**: Next.js Image component for meal photos
- **Lazy Loading**: Route-based code splitting
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile First**: Responsive design with touch-friendly interactions

### Security Measures

- **Input Validation**: Zod schemas for all forms and API inputs
- **Sanitization**: DOMPurify for user-generated content
- **Rate Limiting**: Prevent API abuse
- **CORS**: Proper cross-origin configuration
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **Secret Management**: Azure Key Vault integration

### Monitoring & Analytics

- **Application Insights**: Performance and error tracking
- **Custom Telemetry**: User flow and feature usage
- **Cost Monitoring**: Azure OpenAI usage tracking
- **Health Checks**: API endpoint monitoring
- **Alerts**: Proactive issue detection

### Testing Strategy

- **Unit Tests**: Components and utility functions
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user flows (Playwright)
- **Accessibility Tests**: Automated a11y testing
- **Performance Tests**: Core Web Vitals monitoring

## Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

## Notes

- Focus on MVP - avoid feature creep
- Prioritize user experience over complex features
- Ensure type safety throughout the application
- Plan for Azure deployment from the start
- Implement comprehensive error handling early
- Test accessibility and performance regularly
