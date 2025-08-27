import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { ChevronDownIcon, ChevronUpIcon, LifeBuoyIcon, SearchIcon } from '../components/Icons';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  category: string;
  questions: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    category: 'Getting Started',
    questions: [
      { q: 'How do I enroll in a course?', a: 'To enroll in a course, simply navigate to the "Dashboard", find a course you\'re interested in under "Explore Courses", and click "View Course". On the course details page, you will find an "Enroll" button.' },
      { q: 'How do I change my password?', a: 'You can change your password from the "Profile" page. Click on your avatar in the top-right corner, select "Profile", and you will find an option to update your password under the security settings.' },
    ],
  },
  {
    category: 'Courses & Lessons',
    questions: [
      { q: 'How can I track my progress?', a: 'Your progress for each course is shown on a progress bar on the course card in your "Dashboard". You can also see a detailed breakdown of completed lessons inside the course player.' },
      { q: 'Can I download course materials?', a: 'Some lessons may include downloadable resources like PDFs. If available, a download button will be visible within the lesson view in the course player.' },
      { q: 'What happens if I fail a quiz?', a: 'If you do not achieve the passing score on a quiz, you will be prompted to review the material and can retake the quiz. Your highest score will be recorded.' },
    ],
  },
   {
    category: 'Account Management',
    questions: [
      { q: 'How do I update my profile information?', a: 'You can update your personal information, including your name, bio, and avatar, by going to the "Profile" page from the main sidebar.' },
      { q: 'Where can I find my certificates?', a: 'Once you complete a course (100% progress), your certificate will be available for download in the "Certifications" section, accessible from the sidebar.' },
    ],
  },
];


const FaqAccordion: React.FC<{ item: FaqItem, isOpen: boolean, onToggle: () => void }> = ({ item, isOpen, onToggle }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700">
            <button onClick={onToggle} className="w-full flex justify-between items-center text-left p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none">
                <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">{item.q}</span>
                {isOpen ? <ChevronUpIcon className="w-6 h-6 text-pink-500"/> : <ChevronDownIcon className="w-6 h-6 text-gray-400"/>}
            </button>
            {isOpen && (
                <div className="p-5 pt-0">
                    <p className="text-gray-600 dark:text-gray-400">{item.a}</p>
                </div>
            )}
        </div>
    )
}


export const HelpPage: React.FC<{ user: User }> = ({ user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openFaq, setOpenFaq] = useState<string | null>(null);

    const filteredFaqData = useMemo(() => {
        if (!searchTerm) return faqData;

        const lowercasedFilter = searchTerm.toLowerCase();
        
        return faqData
            .map(category => ({
                ...category,
                questions: category.questions.filter(
                    item =>
                        item.q.toLowerCase().includes(lowercasedFilter) ||
                        item.a.toLowerCase().includes(lowercasedFilter)
                ),
            }))
            .filter(category => category.questions.length > 0);
    }, [searchTerm]);

    return (
        <div className="p-4 md:p-8">
            <div className="text-center max-w-3xl mx-auto">
                <LifeBuoyIcon className="w-16 h-16 mx-auto text-pink-500" />
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">Help Center</h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-400">
                    Hello {user.firstName}, how can we help you today? Find answers to common questions below.
                </p>
                <div className="mt-8 relative">
                    <input 
                        type="text"
                        placeholder="Search for answers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-4 pl-12 border-2 border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"/>
                </div>
            </div>

            <div className="mt-16 max-w-4xl mx-auto">
                {filteredFaqData.map(category => (
                    <div key={category.category} className="mb-12">
                        <h2 className="text-2xl font-bold mb-4 pb-2 border-b-2 border-pink-500">{category.category}</h2>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                           {category.questions.map((item, index) => (
                                <FaqAccordion 
                                    key={index}
                                    item={item}
                                    isOpen={openFaq === `${category.category}-${index}`}
                                    onToggle={() => setOpenFaq(openFaq === `${category.category}-${index}` ? null : `${category.category}-${index}`)}
                                />
                           ))}
                        </div>
                    </div>
                ))}
                 {filteredFaqData.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p className="text-xl font-semibold">No results found for "{searchTerm}"</p>
                        <p>Try searching for a different keyword.</p>
                    </div>
                 )}
            </div>

            <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700 max-w-4xl mx-auto">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold">Still need help?</h2>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">If you can't find the answer you're looking for, please reach out to our support team.</p>
                </div>
                <form className="mt-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold mb-1">Your Name</label>
                            <input type="text" defaultValue={`${user.firstName} ${user.lastName}`} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                         <div>
                            <label className="block text-sm font-bold mb-1">Your Email</label>
                            <input type="email" defaultValue={user.email} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Your Message</label>
                        <textarea rows={6} placeholder="Describe your issue in detail..." className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"></textarea>
                    </div>
                    <div className="text-right">
                        <button type="submit" className="bg-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-600 transition-all text-lg">
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );
};