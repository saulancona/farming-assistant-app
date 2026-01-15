import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, Award, RefreshCw } from 'lucide-react';
import type { ArticleQuiz as ArticleQuizType, QuizQuestion } from '../../data/articleQuizzes';
import TalkingButton from '../TalkingButton';

interface ArticleQuizProps {
  quiz: ArticleQuizType;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
  isSwahili: boolean;
}

export default function ArticleQuiz({ quiz, onComplete, onClose, isSwahili }: ArticleQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(quiz.questions.length).fill(null));
  const [quizComplete, setQuizComplete] = useState(false);

  const question = quiz.questions[currentQuestion];
  const totalQuestions = quiz.questions.length;
  const passingScore = 3; // Must get at least 3 out of 4 correct

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz complete - calculate score
      setQuizComplete(true);
    }
  };

  const calculateScore = (): number => {
    let score = 0;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] === quiz.questions[i].correctIndex) {
        score++;
      }
    }
    return score;
  };

  const handleFinish = () => {
    const finalScore = calculateScore();
    const passed = finalScore >= passingScore;
    onComplete(passed, finalScore);
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers(Array(quiz.questions.length).fill(null));
    setQuizComplete(false);
  };

  const getQuestionText = (q: QuizQuestion) => isSwahili ? q.questionSw : q.question;
  const getOptions = (q: QuizQuestion) => isSwahili ? q.optionsSw : q.options;

  if (quizComplete) {
    const score = calculateScore();
    const passed = score >= passingScore;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto"
      >
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {passed ? (
              <Award className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {passed
              ? (isSwahili ? 'Hongera!' : 'Congratulations!')
              : (isSwahili ? 'Jaribu Tena' : 'Try Again')}
          </h2>

          <p className="text-gray-600 mb-4">
            {isSwahili
              ? `Umepata ${score} kati ya ${totalQuestions} maswali sahihi.`
              : `You got ${score} out of ${totalQuestions} questions correct.`}
          </p>

          {passed ? (
            <p className="text-green-600 font-medium mb-6">
              {isSwahili
                ? 'Umefaulu jaribio! Makala imekamilika.'
                : 'You passed the quiz! Article completed.'}
            </p>
          ) : (
            <p className="text-red-600 font-medium mb-6">
              {isSwahili
                ? `Unahitaji angalau ${passingScore} kati ya ${totalQuestions} sahihi ili kupita.`
                : `You need at least ${passingScore} out of ${totalQuestions} correct to pass.`}
            </p>
          )}

          {/* Show answers review */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-700 mb-3">
              {isSwahili ? 'Mapitio ya Majibu:' : 'Answer Review:'}
            </h3>
            <div className="space-y-2">
              {quiz.questions.map((q, index) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === q.correctIndex;
                return (
                  <div key={index} className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm">
                      <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                        Q{index + 1}:
                      </span>{' '}
                      <span className="text-gray-600">
                        {isCorrect
                          ? (isSwahili ? 'Sahihi' : 'Correct')
                          : (isSwahili
                              ? `Jibu sahihi: ${getOptions(q)[q.correctIndex]}`
                              : `Correct answer: ${getOptions(q)[q.correctIndex]}`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            {!passed && (
              <TalkingButton
                voiceLabel={isSwahili ? 'Jaribu tena' : 'Try again'}
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <RefreshCw size={20} />
                {isSwahili ? 'Jaribu Tena' : 'Try Again'}
              </TalkingButton>
            )}
            <TalkingButton
              voiceLabel={passed ? (isSwahili ? 'Maliza' : 'Finish') : (isSwahili ? 'Funga' : 'Close')}
              onClick={passed ? handleFinish : onClose}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                passed
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {passed
                ? (isSwahili ? 'Maliza na Pata XP' : 'Finish & Earn XP')
                : (isSwahili ? 'Funga' : 'Close')}
            </TalkingButton>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} />
            <span className="font-medium">
              {isSwahili ? 'Jaribio la Makala' : 'Article Quiz'}
            </span>
          </div>
          <span className="text-sm opacity-90">
            {currentQuestion + 1}/{totalQuestions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-green-700 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {getQuestionText(question)}
            </h3>

            <div className="space-y-3">
              {getOptions(question).map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctIndex;
                const showCorrectness = showResult;

                let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-all ';

                if (showCorrectness) {
                  if (isCorrect) {
                    buttonClass += 'border-green-500 bg-green-50 text-green-700';
                  } else if (isSelected && !isCorrect) {
                    buttonClass += 'border-red-500 bg-red-50 text-red-700';
                  } else {
                    buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                  }
                } else if (isSelected) {
                  buttonClass += 'border-green-500 bg-green-50 text-green-700';
                } else {
                  buttonClass += 'border-gray-200 hover:border-green-300 hover:bg-green-50';
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={showResult}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        showCorrectness && isCorrect
                          ? 'border-green-500 bg-green-500'
                          : showCorrectness && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-500'
                          : isSelected
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {showCorrectness && isCorrect && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                        {showCorrectness && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                        {!showCorrectness && isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Result feedback */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-3 rounded-lg ${
                  selectedAnswer === question.correctIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {selectedAnswer === question.correctIndex
                  ? (isSwahili ? 'Sahihi! Vizuri sana!' : 'Correct! Well done!')
                  : (isSwahili
                      ? `Si sahihi. Jibu sahihi ni: ${getOptions(question)[question.correctIndex]}`
                      : `Incorrect. The correct answer is: ${getOptions(question)[question.correctIndex]}`)}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <TalkingButton
            voiceLabel={isSwahili ? 'Funga' : 'Close'}
            onClick={onClose}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {isSwahili ? 'Funga' : 'Cancel'}
          </TalkingButton>

          {!showResult ? (
            <TalkingButton
              voiceLabel={isSwahili ? 'Thibitisha jibu' : 'Confirm answer'}
              onClick={handleConfirmAnswer}
              disabled={selectedAnswer === null}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwahili ? 'Thibitisha' : 'Confirm Answer'}
            </TalkingButton>
          ) : (
            <TalkingButton
              voiceLabel={currentQuestion < totalQuestions - 1 ? (isSwahili ? 'Swali linalofuata' : 'Next question') : (isSwahili ? 'Ona matokeo' : 'See results')}
              onClick={handleNextQuestion}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              {currentQuestion < totalQuestions - 1
                ? (isSwahili ? 'Swali Linalofuata' : 'Next Question')
                : (isSwahili ? 'Ona Matokeo' : 'See Results')}
            </TalkingButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}
