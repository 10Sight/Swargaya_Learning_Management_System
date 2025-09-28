# Quiz Submission API Documentation

## Endpoint
`POST /api/attempts/submit-quiz`

## Expected Payload Format

```json
{
  "quizId": "64f5b2c8e4b0123456789abc",
  "answers": [
    {
      "text": "Selected answer text for question 1"
    },
    {
      "text": "Selected answer text for question 2"  
    },
    null,
    {
      "text": "Selected answer text for question 4"
    }
  ],
  "timeTaken": 125
}
```

## Payload Field Descriptions

### quizId (required)
- **Type**: String (MongoDB ObjectId)
- **Description**: The ID of the quiz being submitted
- **Example**: `"64f5b2c8e4b0123456789abc"`

### answers (required)
- **Type**: Array of Objects or null
- **Description**: Array of user answers corresponding to each quiz question in order
- **Format**: Each answer should be either:
  - An object with a `text` property: `{ "text": "Answer text" }`
  - `null` or `undefined` for unanswered questions
- **Length**: Must match the number of questions in the quiz exactly

### timeTaken (optional)
- **Type**: Number
- **Description**: Time taken to complete the quiz in seconds
- **Default**: 0 if not provided
- **Validation**: Must be a non-negative number

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "attemptId": "64f5b2c8e4b0123456789def",
    "quiz": {
      "_id": "64f5b2c8e4b0123456789abc",
      "title": "JavaScript Fundamentals Quiz",
      "module": { ... },
      "course": { ... },
      "passingScore": 70
    },
    "score": 8,
    "totalMarks": 10,
    "scorePercent": 80,
    "passed": true,
    "attemptsUsed": 1,
    "attemptsAllowed": 3,
    "attemptsRemaining": 2,
    "canRetry": true,
    "timeTaken": 125,
    "detailedAnswers": [
      {
        "questionNumber": 1,
        "questionText": "What is JavaScript?",
        "userAnswer": "A programming language",
        "correctAnswer": "A programming language",
        "isCorrect": true,
        "marksObtained": 2,
        "totalMarks": 2
      }
      // ... more detailed answers
    ],
    "nextModuleUnlocked": false,
    "levelUpgraded": false,
    "newLevel": null
  },
  "message": "Quiz completed successfully! You passed."
}
```

### Error Responses

#### 400 Bad Request - Invalid Payload
```json
{
  "success": false,
  "message": "Answers must be provided as an array"
}
```

#### 400 Bad Request - Answer Count Mismatch
```json
{
  "success": false,
  "message": "Expected 5 answers, but received 3"
}
```

#### 400 Bad Request - Invalid Answer Format
```json
{
  "success": false,
  "message": "Invalid answer format at index 2. Expected object with 'text' property or null"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Quiz not found"
}
```

#### 400 Bad Request - No Attempts Remaining
```json
{
  "success": false,
  "message": "No attempts remaining for this quiz"
}
```

## Validation Rules

1. **Quiz ID**: Must be a valid MongoDB ObjectId format
2. **Answers Array**: 
   - Must be an array
   - Length must exactly match the number of questions in the quiz
   - Each element must be either an object with a 'text' property or null/undefined
3. **Time Taken**: If provided, must be a non-negative number
4. **Quiz Data**: Quiz must exist and have valid question structure
5. **Attempts**: User must have remaining attempts for the quiz

## Common Error Prevention

1. Ensure the answers array has the exact same length as the quiz questions
2. Use the correct format for answers: `{ text: "answer" }` or `null`
3. Provide a valid MongoDB ObjectId for quizId
4. Check attempt limits before submission
5. Ensure the quiz exists and is accessible to the user

## Example Frontend Code

```javascript
const submitQuiz = async (quizId, userAnswers, timeSpent) => {
  try {
    const response = await fetch('/api/attempts/submit-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        quizId: quizId,
        answers: userAnswers, // Array of { text: "answer" } or null
        timeTaken: timeSpent
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    console.error('Quiz submission failed:', error.message);
    throw error;
  }
};
```
