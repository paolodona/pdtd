You are helping create a technical implementation plan.

**Instructions:**
1. **Check for existing plan**: First, check if `.agent_session/plan.md` already exists
   - If it exists and has content, use the AskUserQuestion tool to ask:
     - Question: "An existing plan was found. What would you like to do?"
     - Options:
       1. "Overwrite with new plan" - Clear the old plan and create a new one
       2. "Keep existing plan" - Abort the create-plan process and keep the current plan
   - If the user chooses "Keep existing plan", stop here and tell them to review the existing plan or run `/clear` first

2. Read the user's request for what they want to implement

3. Analyze the current codebase structure in budget_analysis/

4. Create a detailed technical plan covering:
   - Files that need to be created/modified
   - API endpoints to add
   - Frontend components needed
   - Testing strategy

5. Save the complete plan to `.agent_session/plan.md`

6. Save a summary to `.agent_session/context.md` with:
   - Date and time
   - Brief description of planned work
   - Key files involved

**Output Format:**
- Use clear markdown formatting
- Include file paths with line numbers where relevant
- List dependencies and prerequisites
- Provide step-by-step implementation order

After saving the files, tell the user to:
1. Review the plan in `.agent_session/plan.md`
2. Run `/clear` to reset context
3. Run `/implement-plan` when ready to proceed
