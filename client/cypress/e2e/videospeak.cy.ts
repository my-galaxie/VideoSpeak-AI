describe('VideoSpeak E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the main interface', () => {
    cy.contains('VideoSpeak').should('be.visible');
    cy.contains('Enter YouTube Video URL').should('be.visible');
    cy.contains('Select Target Language').should('be.visible');
  });

  it('should validate YouTube URL input', () => {
    cy.get('input[type="url"]').type('invalid-url');
    cy.contains('Process Video').click();
    cy.contains('Please enter a valid YouTube URL').should('be.visible');
  });

  it('should accept valid YouTube URL', () => {
    cy.get('input[type="url"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    cy.contains('Process Video').should('not.be.disabled');
  });

  it('should show language selector', () => {
    cy.contains('Select Target Language').click();
    cy.contains('Hindi').should('be.visible');
    cy.contains('Kannada').should('be.visible');
    cy.contains('Telugu').should('be.visible');
  });

  it('should handle processing workflow', () => {
    // Mock API responses
    cy.intercept('POST', '/api/process-video', {
      statusCode: 202,
      body: { jobId: 'test-job-123', status: 'pending', message: 'Processing started' }
    }).as('processVideo');

    cy.intercept('GET', '/api/job-status/test-job-123', {
      statusCode: 200,
      body: {
        jobId: 'test-job-123',
        status: 'processing',
        progress: 50,
        currentStage: 'transcribing'
      }
    }).as('jobStatus');

    cy.get('input[type="url"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    cy.contains('Process Video').click();

    cy.wait('@processVideo');
    cy.contains('Transcribing').should('be.visible');
    cy.contains('50%').should('be.visible');
  });
});