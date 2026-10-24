import type { APIRoute } from 'astro';
import { site, href } from '../../lib/site';

// Builds the admin panel's configuration. The repository is detected automatically on GitHub,
// so a new club never has to edit this file. (The output is JSON, which is valid YAML.)
const repo = process.env.CMS_REPO || process.env.GITHUB_REPOSITORY || 'OWNER/REPO';
const branch = process.env.CMS_BRANCH || process.env.GITHUB_REF_NAME || 'main';
const authUrl = process.env.CMS_AUTH_URL || site.integrations.cmsAuthUrl;

type Field = Record<string, any>;
const str = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'string', required: false, ...extra });
const txt = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'text', required: false, ...extra });
const img = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'image', required: false, ...extra });
const md = (name: string, label: string, extra: Field = {}): Field => ({ name, label, widget: 'markdown', required: false, ...extra });
const obj = (name: string, label: string, fields: Field[], extra: Field = {}): Field => ({ name, label, widget: 'object', collapsed: true, required: false, fields, ...extra });
const list = (name: string, label: string, fields: Field[], extra: Field = {}): Field => ({ name, label, widget: 'list', required: false, collapsed: true, fields, ...extra });
/** Optional Bangla versions of fields. Anything left empty falls back to English on the Bangla site. */
const bangla = (fields: Field[]): Field[] =>
  site.features.bangla ? [obj('bn', 'বাংলা (Bangla translation, optional)', fields.map((f) => ({ ...f, required: false })))] : [];
const memberPicker = (name: string, label: string, extra: Field = {}): Field => ({
  name, label, widget: 'relation', collection: 'members', search_fields: ['name'], value_field: '{{slug}}', display_fields: ['name'], ...extra,
});
const categories = [
  { label: 'Service', value: 'service' }, { label: 'Meeting', value: 'meeting' }, { label: 'Fellowship', value: 'fellowship' },
  { label: 'Training', value: 'training' }, { label: 'District', value: 'district' }, { label: 'Other', value: 'other' },
];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((label, i) => ({ label, value: i + 1 }));
const dayMonth = (name: string, label: string): Field =>
  obj(name, label, [
    { name: 'month', label: 'Month', widget: 'select', options: months, required: false },
    { name: 'day', label: 'Day', widget: 'number', value_type: 'int', min: 1, max: 31, required: false },
  ], { hint: 'Day and month only. Fill this in only if the member agrees to have it shown on the Greetings page.' });
const personFields = (prefix: string, leo: boolean): Field[] => [
  str('name', 'Full name', { required: true, hint: `Without "${prefix}" and without honours.` }),
  str('handle', 'Profile link name', { required: true, pattern: ['^[a-z0-9]+$', 'Lowercase letters and numbers only, no spaces'], hint: `asifarefinbonny gives the address /${leo ? 'leo' : 'ln'}-asifarefinbonny/` }),
  ...(leo ? [str('position', 'Position in the Leo club', { hint: 'For example: President, Secretary' })] : [str('titles', 'Honours', { hint: 'For example: MJF or PMJF' })]),
  img('photo', 'Photo'),
  str('memberSince', leo ? 'Leo since (year)' : 'Lion since (year)'),
  str('profession', 'Profession'),
  str('organisation', 'Organisation'),
  str('phone', 'Phone (public)'),
  str('whatsapp', 'WhatsApp number (public)', { hint: 'With country code, for example 8801XXXXXXXXX' }),
  str('email', 'Email (public)'),
  str('facebook', 'Facebook link'),
  str('linkedin', 'LinkedIn link'),
  str('website', 'Website'),
  dayMonth('birthday', 'Birthday (optional)'),
  dayMonth('anniversary', 'Wedding anniversary (optional)'),
  { name: 'hidden', label: 'Hide from the website', widget: 'boolean', default: false, required: false },
  md('body', 'About'),
  ...bangla([str('name', 'Full name'), leo ? str('position', 'Position') : str('titles', 'Honours'), str('profession', 'Profession'), str('organisation', 'Organisation'), md('body', 'About')]),
];
const icons = ['eye', 'heart', 'leaf', 'food', 'youth', 'hands', 'book', 'globe', 'user', 'calendar', 'gift', 'cake'];

const config = {
  backend: { name: 'github', repo, branch, ...(authUrl ? { base_url: authUrl } : {}) },
  site_url: new URL(href('/'), import.meta.env.SITE).href,
  media_folder: 'src/assets/uploads',
  public_folder: '/src/assets/uploads',
  // Photos are saved as high-quality WebP (up to 2560px, quality 90) so they stay sharp without storing
  // multi-megabyte camera files. PDFs are never altered. Nothing larger than 20 MB can be uploaded.
  media_libraries: {
    default: {
      config: {
        max_file_size: 20_000_000,
        slugify_filename: true,
        transformations: { raster_image: { format: 'webp', quality: 90, width: 2560, height: 2560 }, svg: { optimize: true } },
      },
    },
  },
  collections: [
    {
      name: 'events', label: 'Events & Activities', label_singular: 'Event or activity', icon: 'event',
      description: 'Upcoming events and past activities. Future dates appear under Events; everything appears on the Activities timeline.',
      folder: 'src/content/events', extension: 'md', format: 'frontmatter', create: true, slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
      summary: '{{date | date("YYYY-MM-DD")}} · {{title}}', sortable_fields: ['date', 'title'],
      fields: [
        str('title', 'Title', { required: true }),
        { name: 'date', label: 'Date and time', widget: 'datetime', format: 'YYYY-MM-DDTHH:mm', picker_utc: true, required: true },
        { name: 'endDate', label: 'Ends (optional)', widget: 'datetime', format: 'YYYY-MM-DDTHH:mm', picker_utc: true, required: false, default: '' },
        { name: 'category', label: 'Type', widget: 'select', options: categories, default: 'service', required: false },
        { name: 'leo', label: 'Leo Club activity', widget: 'boolean', default: false, required: false, hint: 'Also lists it on the Leo Club page.' },
        { name: 'notify', label: 'Send an SMS reminder to members', widget: 'boolean', default: false, required: false, hint: 'Sent the day before, at 9 am. Works once SMS is set up under Club settings.' },
        str('venue', 'Venue'),
        str('address', 'Address'),
        str('mapUrl', 'Google Maps link'),
        txt('summary', 'Short summary', { hint: 'One or two sentences shown on cards and the timeline.' }),
        img('cover', 'Cover photo', { hint: 'Shown on event cards, the timeline and the photo gallery.' }),
        { name: 'gallery', label: 'More photos', widget: 'list', required: false, hint: 'These appear on the event page and in the photo gallery.', field: { name: 'image', label: 'Photo', widget: 'image' } },
        md('body', 'Full details'),
        ...bangla([str('title', 'Title'), str('venue', 'Venue'), str('address', 'Address'), txt('summary', 'Short summary'), md('body', 'Full details')]),
      ],
    },
    {
      name: 'bulletins', label: 'Monthly Bulletin', label_singular: 'Bulletin issue', icon: 'menu_book',
      description: 'Upload the monthly bulletin PDF. The site turns its pages into an online reader automatically. Everything in the PDF becomes public, so upload a version without finance or dues pages.',
      folder: 'src/content/bulletins', extension: 'md', format: 'frontmatter', create: true, slug: '{{year}}-{{month}}-{{slug}}',
      summary: '{{date | date("MMMM YYYY")}} · {{title}}', sortable_fields: ['date'],
      fields: [
        str('title', 'Title', { required: true, hint: 'For example: Bulletin, June 2026' }),
        { name: 'date', label: 'Month of issue', widget: 'datetime', format: 'YYYY-MM-DD', time_format: false, picker_utc: true, required: true },
        { name: 'pdf', label: 'Bulletin PDF', widget: 'file', required: false, media_folder: '/public/files/bulletins', public_folder: '/files/bulletins' },
        img('cover', 'Cover image', { hint: 'Optional. The first page of the PDF is used if left empty.' }),
        { name: 'pages', label: 'Page images', widget: 'list', required: false, hint: 'Optional. Only needed if you have photos or scans instead of a PDF.', field: { name: 'image', label: 'Page', widget: 'image' } },
        txt('summary', 'Short summary'),
        md('body', 'Notes'),
        ...bangla([str('title', 'Title'), txt('summary', 'Short summary'), md('body', 'Notes')]),
      ],
    },
    {
      name: 'members', label: 'Members', label_singular: 'Member', icon: 'group',
      description: 'Each member gets a shareable profile page. Contact details are optional and are visible to everyone if filled in.',
      folder: 'src/content/members', extension: 'md', format: 'frontmatter', create: true, slug: 'ln-{{fields.handle}}',
      identifier_field: 'name', summary: '{{name}}', sortable_fields: ['name', 'memberSince'],
      fields: personFields(site.memberPrefix, false),
    },
    {
      name: 'leos', label: 'Leo Club members', label_singular: 'Leo member', icon: 'diversity_3',
      description: 'Members of the Leo club. They appear on the Leo Club page and each gets a shareable profile.',
      folder: 'src/content/leos', extension: 'md', format: 'frontmatter', create: true, slug: 'leo-{{fields.handle}}',
      identifier_field: 'name', summary: '{{name}} · {{position}}', sortable_fields: ['name'],
      fields: personFields(site.leoPrefix, true),
    },
    {
      name: 'committees', label: 'Committees', label_singular: 'Committee', icon: 'groups',
      description: 'One entry per Lions year. The newest year is shown as the current committee.',
      folder: 'src/content/committees', extension: 'json', format: 'json', create: true, slug: '{{fields.year}}',
      identifier_field: 'year', summary: 'Committee {{year}}',
      fields: [
        str('year', 'Lions year', { required: true, pattern: ['^\\d{4}-\\d{4}$', 'Use the form 2026-2027'], hint: 'For example: 2026-2027' }),
        str('theme', 'Theme or motto for the year'),
        list('members', 'Committee members', [
          memberPicker('member', 'Member', { required: true }),
          str('position', 'Position', { required: true }),
          str('group', 'Section', { hint: 'For example: Office Bearers, Directors. Members with the same section are shown together.' }),
          ...bangla([str('position', 'Position'), str('group', 'Section')]),
        ], { summary: '{{position}}' }),
        ...bangla([str('theme', 'Theme or motto for the year')]),
      ],
    },
    {
      name: 'pages', label: 'Pages & Settings', icon: 'settings',
      files: [
        {
          name: 'home', label: 'Home page', file: 'src/data/home.json', format: 'json',
          fields: [
            obj('hero', 'Top banner', [
              str('eyebrow', 'Small heading'), str('title', 'Headline', { required: true }), txt('text', 'Text'), img('image', 'Background photo', { hint: 'Optional. A wide photo works best. Leave empty for the plain blue banner.' }),
              ...bangla([str('eyebrow', 'Small heading'), str('title', 'Headline'), txt('text', 'Text')]),
            ], { collapsed: false }),
            list('stats', 'Numbers', [str('value', 'Number', { required: true }), str('label', 'Label', { required: true }), ...bangla([str('value', 'Number'), str('label', 'Label')])], { summary: '{{value}} {{label}}' }),
            str('causesTitle', 'Service areas heading'),
            list('causes', 'Service areas', [
              { name: 'icon', label: 'Icon', widget: 'select', options: icons, default: 'hands' },
              str('title', 'Title', { required: true }), txt('text', 'Text'),
              ...bangla([str('title', 'Title'), txt('text', 'Text')]),
            ], { summary: '{{title}}' }),
            obj('greetings', 'Birthday and anniversary greetings', [
              { name: 'enabled', label: 'Show greetings on the home page', widget: 'boolean', default: true, required: false },
              str('title', "Heading for today's greetings"), str('soonTitle', 'Heading for the coming week'),
              txt('birthdayWish', 'Birthday wish'), txt('anniversaryWish', 'Anniversary wish'),
              ...bangla([str('title', "Heading for today's greetings"), str('soonTitle', 'Heading for the coming week'), txt('birthdayWish', 'Birthday wish'), txt('anniversaryWish', 'Anniversary wish')]),
            ], { hint: 'Members appear here on their day, with their photo and this wish. Dates are set on each member.' }),
            obj('spotlight', 'Photo banner (optional)', [
              img('image', 'Photo', { hint: 'A wide photo shown across the home page. The banner is hidden while this is empty.' }),
              str('title', 'Heading'), txt('text', 'Text'), str('button', 'Button label'), str('link', 'Button link', { hint: 'For example: /activities/' }),
              ...bangla([str('title', 'Heading'), txt('text', 'Text'), str('button', 'Button label')]),
            ]),
            obj('impact', 'Impact numbers', [
              str('title', 'Heading'),
              { name: 'showAuto', label: 'Include years of service and number of service projects (counted automatically)', widget: 'boolean', default: true, required: false },
              list('items', 'Your own numbers', [
                { name: 'value', label: 'Number', widget: 'number', value_type: 'int', required: true },
                str('suffix', 'Sign after the number', { hint: 'For example: +' }),
                str('label', 'Label', { required: true, hint: 'For example: Patients screened' }),
                { name: 'icon', label: 'Icon', widget: 'select', options: icons, default: 'heart' },
                ...bangla([str('label', 'Label')]),
              ], { summary: '{{value}}{{suffix}} {{label}}' }),
              ...bangla([str('title', 'Heading')]),
            ]),
            obj('message', "President's message", [
              memberPicker('member', 'From', { required: false }), str('title', 'Heading'), txt('text', 'Message'),
              ...bangla([str('title', 'Heading'), txt('text', 'Message')]),
            ]),
            obj('join', 'Join us banner', [
              str('title', 'Heading'), txt('text', 'Text'), str('button', 'Button label'), img('image', 'Background photo (optional)'),
              ...bangla([str('title', 'Heading'), txt('text', 'Text'), str('button', 'Button label')]),
            ]),
            ...bangla([str('causesTitle', 'Service areas heading')]),
          ],
        },
        {
          name: 'about', label: 'About page', file: 'src/content/pages/about.md', format: 'frontmatter',
          fields: [
            str('title', 'Title', { required: true }), txt('intro', 'Introduction'), img('image', 'Photo'),
            md('body', 'Club history'),
            list('timeline', 'Our journey (milestones)', [
              str('year', 'Year', { required: true }), str('title', 'Milestone', { required: true }), txt('text', 'Details'),
              ...bangla([str('title', 'Milestone'), txt('text', 'Details')]),
            ], { summary: '{{year}} · {{title}}' }),
            str('pledgeTitle', 'Club pledge heading'), txt('pledge', 'Club pledge'),
            ...bangla([str('title', 'Title'), txt('intro', 'Introduction'), md('body', 'Club history'), str('pledgeTitle', 'Club pledge heading')]),
          ],
        },
        {
          name: 'founder', label: 'Founder page', file: 'src/content/pages/founder.md', format: 'frontmatter',
          fields: [
            str('title', 'Page title', { required: true }), txt('intro', 'Introduction'),
            memberPicker('member', 'Founder (member profile)', { required: false, hint: 'Pick the founder if they have a member profile. Otherwise type the name below.' }),
            str('name', 'Name', { hint: 'Only needed when no member profile is picked.' }),
            str('role', 'Line under the name'), img('photo', 'Portrait photo'),
            md('body', 'Biography'),
            list('writings', 'Writings', [
              str('title', 'Title', { required: true }), str('date', 'Date', { hint: 'For example: June 2026' }), md('text', 'Text', { required: true }),
              ...bangla([str('title', 'Title'), str('date', 'Date'), md('text', 'Text')]),
            ], { summary: '{{title}}' }),
            ...bangla([str('title', 'Page title'), txt('intro', 'Introduction'), str('name', 'Name'), str('role', 'Line under the name'), md('body', 'Biography')]),
          ],
        },
        {
          name: 'headings', label: 'Page headings & banner photos', file: 'src/data/pages.json', format: 'json',
          description: 'Change the heading and introduction at the top of any page, or add a banner photo. Anything left empty keeps the standard text and the plain blue banner.',
          fields: ([['about', 'About'], ['founder', 'Founder'], ['events', 'Events'], ['activities', 'Activities timeline'], ['gallery', 'Photo gallery'], ['members', 'Members'], ['greetings', 'Birthdays and anniversaries'], ['committee', 'Committee'], ['pastPresidents', 'Past presidents'], ['leo', 'Leo Club'], ['bulletin', 'Monthly bulletin'], ['donate', 'Donate'], ['join', 'Join'], ['clubs', 'District clubs'], ['resources', 'Resources'], ['contact', 'Contact']] as [string, string][]).map(([name, label]) =>
            obj(name, label, [
              str('title', 'Heading'), txt('intro', 'Introduction'), img('image', 'Banner photo', { hint: 'A wide photo. Leave empty for the plain blue banner.' }),
              ...bangla([str('title', 'Heading'), txt('intro', 'Introduction')]),
            ]),
          ),
        },
        {
          name: 'presidents', label: 'Past presidents', file: 'src/data/past-presidents.json', format: 'json',
          fields: [
            list('presidents', 'Past presidents', [
              str('term', 'Lions year', { hint: 'For example: 2024-2025' }),
              memberPicker('member', 'Member profile', { required: false, hint: 'Pick the member if they have a profile. Otherwise type the name below.' }),
              str('name', 'Name', { hint: 'Only needed when no member profile is picked.' }),
              img('photo', 'Photo'),
              ...bangla([str('name', 'Name')]),
            ], { summary: '{{term}} {{name}} {{member}}' }),
          ],
        },
        {
          name: 'donate', label: 'Donate page', file: 'src/data/donate.json', format: 'json',
          fields: [
            str('title', 'Title', { required: true }), txt('intro', 'Introduction'),
            list('methods', 'Ways to give', [
              str('label', 'Method', { required: true, hint: 'For example: bKash, Nagad, Bank transfer' }),
              str('accountName', 'Account name'), str('number', 'Number or account number'),
              txt('details', 'Other details', { hint: 'Bank, branch, routing number, or "Send Money" / "Payment".' }),
              img('qr', 'Payment QR code (optional)'),
              ...bangla([str('label', 'Method'), txt('details', 'Other details')]),
            ], { summary: '{{label}} {{number}}' }),
            list('projects', 'Projects to sponsor', [
              str('title', 'Project', { required: true }), txt('text', 'Description'), img('image', 'Photo'),
              { name: 'goal', label: 'Amount needed (Tk)', widget: 'number', value_type: 'int', required: false },
              { name: 'raised', label: 'Amount raised so far (Tk)', widget: 'number', value_type: 'int', required: false },
              ...bangla([str('title', 'Project'), txt('text', 'Description')]),
            ], { summary: '{{title}}' }),
            txt('note', 'Closing note'),
            ...bangla([str('title', 'Title'), txt('intro', 'Introduction'), txt('note', 'Closing note')]),
          ],
        },
        {
          name: 'leo', label: 'Leo Club page', file: 'src/data/leo.json', format: 'json',
          fields: [
            str('name', 'Leo club name', { required: true }), txt('intro', 'Introduction'), txt('body', 'About the Leo club'), img('image', 'Photo'),
            memberPicker('advisor', 'Leo Advisor', { required: false }),
            ...bangla([str('name', 'Leo club name'), txt('intro', 'Introduction'), txt('body', 'About the Leo club')]),
          ],
        },
        {
          name: 'join', label: 'Join page', file: 'src/data/join.json', format: 'json',
          fields: [
            str('title', 'Title', { required: true }), txt('intro', 'Introduction'),
            list('benefits', 'Reasons to join', [{ name: 'icon', label: 'Icon', widget: 'select', options: icons, default: 'heart' }, str('title', 'Title', { required: true }), txt('text', 'Text'), ...bangla([str('title', 'Title'), txt('text', 'Text')])], { summary: '{{title}}' }),
            str('stepsTitle', 'Steps heading'),
            list('steps', 'Steps to join', [str('title', 'Step', { required: true }), txt('text', 'Text'), ...bangla([str('title', 'Step'), txt('text', 'Text')])], { summary: '{{title}}' }),
            str('faqTitle', 'Questions heading'),
            list('faq', 'Questions and answers', [str('q', 'Question', { required: true }), txt('a', 'Answer'), ...bangla([str('q', 'Question'), txt('a', 'Answer')])], { summary: '{{q}}' }),
            str('formTitle', 'Form heading'),
            ...bangla([str('title', 'Title'), txt('intro', 'Introduction'), str('stepsTitle', 'Steps heading'), str('faqTitle', 'Questions heading'), str('formTitle', 'Form heading')]),
          ],
        },
        {
          name: 'clubs', label: 'District clubs directory', file: 'src/data/clubs.json', format: 'json',
          fields: [
            str('title', 'Title', { required: true }), txt('intro', 'Introduction'),
            list('clubs', 'Clubs', [
              str('name', 'Club name', { required: true }), str('location', 'Location'),
              str('url', 'Website address', { hint: 'Leave empty for this club.' }), img('logo', 'Logo'),
              ...bangla([str('name', 'Club name'), str('location', 'Location')]),
            ], { summary: '{{name}}' }),
            ...bangla([str('title', 'Title'), txt('intro', 'Introduction')]),
          ],
        },
        {
          name: 'resources', label: 'Resources page', file: 'src/data/resources.json', format: 'json',
          fields: [
            str('title', 'Title', { required: true }), txt('intro', 'Introduction'),
            list('items', 'Documents and links', [
              str('title', 'Title', { required: true }), str('category', 'Group', { hint: 'Items with the same group are listed together.' }), txt('description', 'Description'),
              { name: 'file', label: 'Document to download', widget: 'file', required: false, media_folder: '/public/files/resources', public_folder: '/files/resources' },
              str('url', 'Or a link'),
              ...bangla([str('title', 'Title'), str('category', 'Group'), txt('description', 'Description')]),
            ], { summary: '{{title}}' }),
            ...bangla([str('title', 'Title'), txt('intro', 'Introduction')]),
          ],
        },
        {
          name: 'site', label: 'Club settings', file: 'src/data/site.json', format: 'json',
          fields: [
            str('name', 'Club name', { required: true }), str('shortName', 'Short name', { required: true }), str('tagline', 'Tagline'),
            txt('description', 'Short description (for Google and link previews)'), img('logo', 'Club logo'),
            str('affiliation', 'Affiliation line'), str('clubNo', 'Club number'), str('identNo', 'Ident number'),
            { name: 'charterDate', label: 'Charter day', widget: 'datetime', format: 'YYYY-MM-DD', time_format: false, picker_utc: true, required: false },
            str('founder', 'Founder'), str('memberPrefix', 'Prefix before member names', { hint: 'For example: Ln.' }), str('leoPrefix', 'Prefix before Leo member names', { hint: 'For example: Leo' }),
            { name: 'utcOffsetHours', label: 'Timezone (hours from UTC)', widget: 'number', value_type: 'float', default: 6 },
            obj('theme', 'Colours', [
              { name: 'primary', label: 'Main colour', widget: 'color' }, { name: 'accent', label: 'Accent colour', widget: 'color' }, { name: 'highlight', label: 'Highlight colour', widget: 'color' },
            ]),
            obj('contact', 'Contact details', [
              str('email', 'Email'), str('phone', 'Phone'), str('whatsapp', 'WhatsApp number', { hint: 'With country code. Shows a chat button when live chat is not set up.' }),
              str('address', 'Address'), str('mapUrl', 'Google Maps link'), str('meeting', 'Regular meeting', { hint: 'For example: Last Friday of every month, 7:30 pm' }),
              ...bangla([str('address', 'Address'), str('meeting', 'Regular meeting')]),
            ]),
            obj('social', 'Social media links', [str('facebook', 'Facebook'), str('instagram', 'Instagram'), str('youtube', 'YouTube'), str('linkedin', 'LinkedIn')]),
            obj('sms', 'SMS to members', [
              { name: 'enabled', label: 'Send automatic SMS', widget: 'boolean', default: false, required: false },
              { name: 'language', label: 'Language of the messages', widget: 'select', options: [{ label: 'English', value: 'en' }, { label: 'বাংলা', value: 'bn' }], default: 'en' },
              { name: 'greetings', label: 'Send birthday and anniversary greetings', widget: 'boolean', default: true, required: false },
              { name: 'remindDaysBefore', label: 'Send event reminders this many days before', widget: 'list', field: { name: 'days', label: 'Days', widget: 'number', value_type: 'int' }, required: false, hint: '1 means the day before. Add 0 to also remind on the day itself.' },
              { name: 'dailyLimit', label: 'Most SMS per day', widget: 'number', value_type: 'int', default: 50, hint: "TextBee's free plan allows 50 a day and 300 a month." },
              txt('reminderTemplate', 'Event reminder text', { hint: 'You can use {title} {date} {time} {venue} {club}.' }),
              txt('greetingTemplate', 'Greeting text', { hint: 'You can use {name} {wish} {club}. The wish itself is set on the Home page.' }),
              ...bangla([txt('reminderTemplate', 'Event reminder text'), txt('greetingTemplate', 'Greeting text')]),
            ], { hint: 'Messages go out through TextBee from the club phone. Bangla messages are shorter per SMS (70 characters) than English (160).' }),
            obj('announcement', 'Notice bar', [
              { name: 'enabled', label: 'Show the notice bar', widget: 'boolean', default: false }, str('text', 'Notice'), str('link', 'Link (optional)'),
              ...bangla([str('text', 'Notice')]),
            ]),
            obj('features', 'Sections to show', [
              { name: 'events', label: 'Events', widget: 'boolean', default: true }, { name: 'activities', label: 'Activities timeline', widget: 'boolean', default: true },
              { name: 'members', label: 'Members and profiles', widget: 'boolean', default: true }, { name: 'committee', label: 'Committee', widget: 'boolean', default: true },
              { name: 'pastPresidents', label: 'Past presidents', widget: 'boolean', default: true }, { name: 'bulletin', label: 'Monthly bulletin', widget: 'boolean', default: true },
              { name: 'gallery', label: 'Photo gallery', widget: 'boolean', default: true }, { name: 'leo', label: 'Leo Club page', widget: 'boolean', default: true },
              { name: 'greetings', label: 'Birthdays and anniversaries', widget: 'boolean', default: true }, { name: 'donate', label: 'Donate page', widget: 'boolean', default: true },
              { name: 'join', label: 'Join page', widget: 'boolean', default: true }, { name: 'clubs', label: 'District clubs directory', widget: 'boolean', default: true },
              { name: 'resources', label: 'Resources page', widget: 'boolean', default: true }, { name: 'founder', label: 'Founder page', widget: 'boolean', default: true },
              { name: 'bangla', label: 'Bangla version of the site', widget: 'boolean', default: true },
            ]),
            obj('integrations', 'Contact form, live chat and sign-in', [
              str('web3formsKey', 'Web3Forms access key', { hint: 'Free at web3forms.com. Messages from the contact form go to the email you register there.' }),
              str('tawkPropertyId', 'Tawk.to property ID', { hint: 'Free live chat at tawk.to. Both IDs are in the widget link: embed.tawk.to/PROPERTY/WIDGET' }),
              str('tawkWidgetId', 'Tawk.to widget ID'),
              str('cmsAuthUrl', 'Admin sign-in service address', { hint: 'Only needed for the "Sign in with GitHub" button. See the README.' }),
              obj('firebase', 'Member portal (Firebase)', [
                str('apiKey', 'apiKey'), str('authDomain', 'authDomain'), str('projectId', 'projectId'), str('appId', 'appId'),
              ], { hint: 'Lets members sign in at /account/ to update their own profile. Copy these four values from Firebase console → Project settings → Your apps. See the README.' }),
            ]),
            list('links', 'Footer links', [str('label', 'Label', { required: true }), str('url', 'Address', { required: true })], { summary: '{{label}}' }),
            ...bangla([str('name', 'Club name'), str('shortName', 'Short name'), str('tagline', 'Tagline'), txt('description', 'Short description'), str('affiliation', 'Affiliation line'), str('founder', 'Founder'), str('memberPrefix', 'Prefix before member names'), str('leoPrefix', 'Prefix before Leo member names')]),
          ],
        },
      ],
    },
  ],
};

export const GET: APIRoute = () => new Response(JSON.stringify(config, null, 2), { headers: { 'Content-Type': 'text/yaml; charset=utf-8' } });
